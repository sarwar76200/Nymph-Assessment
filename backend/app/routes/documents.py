from uuid import UUID

from fastapi import APIRouter, status

from app.schemas import DocumentMetadataCreate, PlaceholderResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=PlaceholderResponse)
async def list_documents() -> PlaceholderResponse:
    return PlaceholderResponse()


@router.post(
    "",
    response_model=PlaceholderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_metadata(
    document: DocumentMetadataCreate,
) -> PlaceholderResponse:
    del document
    return PlaceholderResponse()


@router.get("/{document_id}", response_model=PlaceholderResponse)
async def get_document(document_id: UUID) -> PlaceholderResponse:
    del document_id
    return PlaceholderResponse()


@router.delete("/{document_id}", response_model=PlaceholderResponse)
async def delete_document(document_id: UUID) -> PlaceholderResponse:
    del document_id
    return PlaceholderResponse()
