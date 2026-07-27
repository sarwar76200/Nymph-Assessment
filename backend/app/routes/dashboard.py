from fastapi import APIRouter
from sqlalchemy import func, select

from app.dependencies import CurrentOrganization, DatabaseSession
from app.models import Conversation, Message
from app.schemas import MessageCountResponse, PlaceholderResponse

router = APIRouter(
    prefix="/organizations/{organization_id}/dashboard",
    tags=["Dashboard"],
)


@router.get("", response_model=PlaceholderResponse)
async def get_dashboard(
    current_organization: CurrentOrganization,
) -> PlaceholderResponse:
    del current_organization
    return PlaceholderResponse()


@router.get(
    "/messages/count",
    response_model=MessageCountResponse,
)
async def get_message_count(
    db: DatabaseSession,
    current_organization: CurrentOrganization,
) -> MessageCountResponse:
    result = await db.execute(
        select(func.count(Message.id))
        .join(
            Conversation,
            Message.conversation_id == Conversation.id,
        )
        .where(
            Conversation.organization_id == current_organization.id
        )
    )
    return MessageCountResponse(
        total_messages=result.scalar_one(),
    )
