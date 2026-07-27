from fastapi import APIRouter
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Conversation, Message
from app.schemas import MessageCountResponse, PlaceholderResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=PlaceholderResponse)
async def get_dashboard() -> PlaceholderResponse:
    return PlaceholderResponse()


@router.get(
    "/messages/count",
    response_model=MessageCountResponse,
)
async def get_message_count(
    db: DatabaseSession,
    current_user: CurrentUser,
) -> MessageCountResponse:
    result = await db.execute(
        select(func.count(Message.id))
        .join(
            Conversation,
            Message.conversation_id == Conversation.id,
        )
        .where(Conversation.user_id == current_user.id)
    )
    return MessageCountResponse(
        total_messages=result.scalar_one(),
    )
