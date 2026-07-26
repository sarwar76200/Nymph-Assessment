from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Conversation, User
from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationStatusUpdate,
    ConversationTitleUpdate,
    MessageCreate,
    PlaceholderResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


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


@router.get("/search", response_model=PlaceholderResponse)
async def search_conversations(
    query: str = Query(min_length=1, max_length=200),
) -> PlaceholderResponse:
    del query
    return PlaceholderResponse()


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
    response_model=PlaceholderResponse,
)
async def list_messages(conversation_id: UUID) -> PlaceholderResponse:
    del conversation_id
    return PlaceholderResponse()


@router.post(
    "/{conversation_id}/messages",
    response_model=PlaceholderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    conversation_id: UUID,
    message: MessageCreate,
) -> PlaceholderResponse:
    del conversation_id, message
    return PlaceholderResponse()
