from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Organization, OrganizationMembership, User
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DatabaseSession,
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id = decode_access_token(token)
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
        raise credentials_error from error

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_error

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_organization(
    organization_id: UUID,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Organization:
    result = await db.execute(
        select(Organization)
        .join(
            OrganizationMembership,
            OrganizationMembership.organization_id == Organization.id,
        )
        .where(
            Organization.id == organization_id,
            OrganizationMembership.user_id == current_user.id,
        )
    )
    organization = result.scalar_one_or_none()
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )
    return organization


CurrentOrganization = Annotated[
    Organization,
    Depends(get_current_organization),
]
