from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencies import (
    CurrentOrganization,
    CurrentUser,
    DatabaseSession,
)
from app.models import Organization, OrganizationMembership, User
from app.schemas import (
    OrganizationCreate,
    OrganizationMemberCreate,
    OrganizationMembershipResponse,
    OrganizationResponse,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: DatabaseSession,
    current_user: CurrentUser,
) -> list[OrganizationResponse]:
    result = await db.execute(
        select(Organization)
        .join(
            OrganizationMembership,
            OrganizationMembership.organization_id == Organization.id,
        )
        .where(OrganizationMembership.user_id == current_user.id)
        .order_by(Organization.name.asc())
    )
    return [
        OrganizationResponse.model_validate(organization)
        for organization in result.scalars().all()
    ]


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: OrganizationCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> OrganizationResponse:
    organization = Organization(name=payload.name)
    db.add(organization)
    await db.flush()
    db.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=current_user.id,
        )
    )
    await db.commit()
    await db.refresh(organization)
    return OrganizationResponse.model_validate(organization)


@router.post(
    "/{organization_id}/members",
    response_model=OrganizationMembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_organization_member(
    payload: OrganizationMemberCreate,
    db: DatabaseSession,
    current_organization: CurrentOrganization,
) -> OrganizationMembershipResponse:
    email = str(payload.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    membership = OrganizationMembership(
        organization_id=current_organization.id,
        user_id=user.id,
    )
    db.add(membership)
    try:
        await db.commit()
        await db.refresh(membership)
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        ) from error

    return OrganizationMembershipResponse.model_validate(membership)
