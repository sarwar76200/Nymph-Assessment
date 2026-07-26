from uuid import UUID

from fastapi import APIRouter, status

from app.schemas import DocumentMetadataCreate, PlaceholderResponse

router = APIRouter(
    prefix="/conversations/{conversation_id}/documents",
    tags=["Documents"],
)


@router.get("", response_model=PlaceholderResponse)
async def list_documents(conversation_id: UUID) -> PlaceholderResponse:
    del conversation_id
    return PlaceholderResponse()


@router.post(
    "",
    response_model=PlaceholderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_metadata(
    conversation_id: UUID,
    document: DocumentMetadataCreate,
) -> PlaceholderResponse:
    del conversation_id, document
    return PlaceholderResponse()


@router.get("/{document_id}", response_model=PlaceholderResponse)
async def get_document(
    conversation_id: UUID,
    document_id: UUID,
) -> PlaceholderResponse:
    del conversation_id, document_id
    return PlaceholderResponse()


@router.delete("/{document_id}", response_model=PlaceholderResponse)
async def delete_document(
    conversation_id: UUID,
    document_id: UUID,
) -> PlaceholderResponse:
    del conversation_id, document_id
    return PlaceholderResponse()
