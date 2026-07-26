from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Incorrect email or password",
    headers={"WWW-Authenticate": "Bearer"},
)
DUMMY_PASSWORD_HASH = hash_password("invalid-placeholder-password")


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    credentials: LoginRequest,
    db: DatabaseSession,
) -> LoginResponse:
    email = str(credentials.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    stored_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_is_valid = await run_in_threadpool(
        verify_password,
        credentials.password,
        stored_hash,
    )

    if user is None or not password_is_valid:
        raise INVALID_CREDENTIALS

    return LoginResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )
