from fastapi import APIRouter, status

from app.schemas import LoginRequest, PlaceholderResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=PlaceholderResponse,
    status_code=status.HTTP_200_OK,
)
async def login(credentials: LoginRequest) -> PlaceholderResponse:
    del credentials
    return PlaceholderResponse()
