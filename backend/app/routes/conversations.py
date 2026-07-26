from uuid import UUID

from fastapi import APIRouter, Query, status

from app.schemas import (
    ConversationCreate,
    ConversationUpdate,
    MessageCreate,
    PlaceholderResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=PlaceholderResponse)
async def list_conversations() -> PlaceholderResponse:
    return PlaceholderResponse()


@router.post(
    "",
    response_model=PlaceholderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    conversation: ConversationCreate,
) -> PlaceholderResponse:
    del conversation
    return PlaceholderResponse()


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


@router.patch("/{conversation_id}", response_model=PlaceholderResponse)
async def update_conversation(
    conversation_id: UUID,
    conversation: ConversationUpdate,
) -> PlaceholderResponse:
    del conversation_id, conversation
    return PlaceholderResponse()


@router.delete(
    "/{conversation_id}",
    response_model=PlaceholderResponse,
)
async def delete_conversation(conversation_id: UUID) -> PlaceholderResponse:
    del conversation_id
    return PlaceholderResponse()


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
