from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.dependencies import (
    CurrentOrganization,
    CurrentUser,
    DatabaseSession,
)
from app.models import Conversation, Document, User
from app.schemas import (
    DocumentMetadataCreate,
    DocumentResponse,
    UserResponse,
)

router = APIRouter(
    prefix="/organizations/{organization_id}",
    tags=["Documents"],
)


@router.get("/documents", response_model=list[DocumentResponse])
async def list_documents(
    db: DatabaseSession,
    current_organization: CurrentOrganization,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[DocumentResponse]:
    result = await db.execute(
        select(Document)
        .join(
            Conversation,
            Document.conversation_id == Conversation.id,
        )
        .where(
            Conversation.organization_id == current_organization.id
        )
        .order_by(Document.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    documents = result.scalars().all()
    return [
        DocumentResponse.model_validate(document)
        for document in documents
    ]


@router.get(
    "/documents/{document_id}/uploader",
    response_model=UserResponse,
)
async def get_document_uploader(
    document_id: UUID,
    db: DatabaseSession,
    current_organization: CurrentOrganization,
) -> UserResponse:
    result = await db.execute(
        select(User)
        .join(Document, Document.uploaded_by_user_id == User.id)
        .join(
            Conversation,
            Conversation.id == Document.conversation_id,
        )
        .where(
            Document.id == document_id,
            Conversation.organization_id == current_organization.id,
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document uploader not found",
        )
    return UserResponse.model_validate(user)


@router.post(
    "/conversations/{conversation_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_metadata(
    conversation_id: UUID,
    payload: DocumentMetadataCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
    current_organization: CurrentOrganization,
) -> DocumentResponse:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.organization_id == current_organization.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    document = Document(
        conversation_id=conversation.id,
        uploaded_by_user_id=current_user.id,
        filename=payload.filename,
        file_type=payload.file_type,
        file_size=payload.file_size,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)
