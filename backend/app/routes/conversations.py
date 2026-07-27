import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Conversation, Message, User
from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationSearchResult,
    ConversationStatusUpdate,
    ConversationTitleUpdate,
    MessageCreate,
    MessageResponse,
    PlaceholderResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])
LOREM_PHRASES = (
    "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod",
    "tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim",
    "veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea",
    "commodo consequat Duis aute irure dolor in reprehenderit in voluptate",
    "velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat",
    "cupidatat non proident sunt in culpa qui officia deserunt mollit anim id",
    "est laborum",
)
LOREM_WORDS = " ".join(LOREM_PHRASES).split()
ASSISTANT_RESPONSE = " ".join(
    (LOREM_WORDS * ((50 // len(LOREM_WORDS)) + 1))[:50]
)


async def get_user_conversation(
    conversation_id: UUID,
    user: User,
    db: AsyncSession,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


async def save_message(
    conversation: Conversation,
    role: str,
    content: str,
    db: AsyncSession,
) -> MessageResponse:
    message = Message(
        conversation_id=conversation.id,
        role=role,
        content=content,
    )
    conversation.updated_at = datetime.now(UTC)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return MessageResponse.model_validate(message)


def format_sse_event(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_chat_response(
    user_message: MessageResponse,
    assistant_message: MessageResponse,
) -> AsyncIterator[str]:
    yield format_sse_event(
        "user_message",
        user_message.model_dump(mode="json"),
    )

    words = assistant_message.content.split()
    chunk_size = 5
    for index in range(0, len(words), chunk_size):
        chunk = " ".join(words[index : index + chunk_size])
        if index + chunk_size < len(words):
            chunk += " "
        yield format_sse_event("assistant_chunk", {"content": chunk})
        await asyncio.sleep(0.2)

    yield format_sse_event(
        "assistant_message",
        assistant_message.model_dump(mode="json"),
    )
    yield format_sse_event("done", {})


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    db: DatabaseSession,
    current_user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ConversationResponse]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(
            case((Conversation.status == "active", 0), else_=1),
            Conversation.updated_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    conversations = result.scalars().all()
    return [
        ConversationResponse.model_validate(conversation)
        for conversation in conversations
    ]


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: ConversationCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> ConversationResponse:
    conversation = Conversation(
        user_id=current_user.id,
        title=payload.title,
        status="active",
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return ConversationResponse.model_validate(conversation)


@router.get(
    "/search",
    response_model=list[ConversationSearchResult],
)
async def search_conversations(
    db: DatabaseSession,
    current_user: CurrentUser,
    query: str = Query(min_length=1, max_length=200),
) -> list[ConversationSearchResult]:
    search_term = query.strip().lower()
    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query must not be blank",
        )

    result = await db.execute(
        select(Conversation, Message)
        .join(
            Message,
            Message.conversation_id == Conversation.id,
        )
        .where(
            Conversation.user_id == current_user.id,
            func.strpos(func.lower(Message.content), search_term) > 0,
        )
        .order_by(
            Conversation.updated_at.desc(),
            Message.created_at.asc(),
        )
    )

    conversations: dict[UUID, ConversationSearchResult] = {}
    for conversation, message in result.all():
        if conversation.id not in conversations:
            conversation_data = ConversationResponse.model_validate(
                conversation
            )
            conversations[conversation.id] = ConversationSearchResult(
                **conversation_data.model_dump(),
                matched_messages=[],
            )
        conversations[conversation.id].matched_messages.append(
            MessageResponse.model_validate(message)
        )

    return list(conversations.values())


@router.get("/{conversation_id}", response_model=PlaceholderResponse)
async def get_conversation(conversation_id: UUID) -> PlaceholderResponse:
    del conversation_id
    return PlaceholderResponse()


@router.patch(
    "/{conversation_id}/title",
    response_model=ConversationResponse,
)
async def update_conversation_title(
    conversation_id: UUID,
    payload: ConversationTitleUpdate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> ConversationResponse:
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    conversation.title = payload.title
    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.patch(
    "/{conversation_id}/status",
    response_model=ConversationResponse,
)
async def update_conversation_status(
    conversation_id: UUID,
    payload: ConversationStatusUpdate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> ConversationResponse:
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    conversation.status = payload.status.value
    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(
    conversation_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> Response:
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    await db.delete(conversation)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def list_messages(
    conversation_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[MessageResponse]:
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()
    return [
        MessageResponse.model_validate(message)
        for message in messages
    ]


@router.get(
    "/{conversation_id}/messages/search",
    response_model=list[MessageResponse],
)
async def search_conversation_messages(
    conversation_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    query: str = Query(min_length=1, max_length=200),
) -> list[MessageResponse]:
    search_term = query.strip().lower()
    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query must not be blank",
        )

    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            func.strpos(func.lower(Message.content), search_term) > 0,
        )
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        MessageResponse.model_validate(message)
        for message in messages
    ]


@router.post(
    "/{conversation_id}/messages",
    response_class=StreamingResponse,
)
async def create_message(
    conversation_id: UUID,
    payload: MessageCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> StreamingResponse:
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )
    user_message = await save_message(
        conversation,
        "user",
        payload.content,
        db,
    )
    assistant_message = await save_message(
        conversation,
        "assistant",
        ASSISTANT_RESPONSE,
        db,
    )
    return StreamingResponse(
        stream_chat_response(user_message, assistant_message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
