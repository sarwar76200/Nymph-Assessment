from fastapi import APIRouter

from app.schemas import PlaceholderResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=PlaceholderResponse)
async def get_dashboard() -> PlaceholderResponse:
    return PlaceholderResponse()
