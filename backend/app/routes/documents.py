from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Conversation, Document
from app.schemas import DocumentMetadataCreate, DocumentResponse

router = APIRouter(tags=["Documents"])


@router.get("/documents", response_model=list[DocumentResponse])
async def list_documents(
    db: DatabaseSession,
    current_user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[DocumentResponse]:
    result = await db.execute(
        select(Document)
        .join(
            Conversation,
            Document.conversation_id == Conversation.id,
        )
        .where(Conversation.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    documents = result.scalars().all()
    return [
        DocumentResponse.model_validate(document)
        for document in documents
    ]


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
) -> DocumentResponse:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
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
        filename=payload.filename,
        file_type=payload.file_type,
        file_size=payload.file_size,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)
