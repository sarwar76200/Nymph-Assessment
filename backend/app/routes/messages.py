from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentOrganization, DatabaseSession
from app.models import Conversation, Message, User
from app.schemas import UserResponse

router = APIRouter(
    prefix="/organizations/{organization_id}/messages",
    tags=["Messages"],
)


@router.get(
    "/{message_id}/author",
    response_model=UserResponse,
)
async def get_message_author(
    message_id: UUID,
    db: DatabaseSession,
    current_organization: CurrentOrganization,
) -> UserResponse:
    result = await db.execute(
        select(User)
        .join(Message, Message.author_user_id == User.id)
        .join(
            Conversation,
            Conversation.id == Message.conversation_id,
        )
        .where(
            Message.id == message_id,
            Conversation.organization_id == current_organization.id,
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message author not found",
        )
    return UserResponse.model_validate(user)
