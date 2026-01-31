"""P1-RBAC-002: Organization invites — create and list pending invites."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.dependencies import ensure_org_admin, require_current_user
from app.supabase_client import get_supabase_client

router = APIRouter()


class CreateInviteBody(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"] = "member"


@router.get("/organizations/{organization_id}/invites")
def list_invites(
    organization_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """List pending invites for the organization. Requires auth and org admin."""
    ensure_org_admin(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("organization_invites")
        .select("id, email, role, invited_by_user_id, expires_at, created_at")
        .eq("organization_id", str(organization_id))
        .execute()
    )
    return {"invites": r.data or []}


@router.post("/organizations/{organization_id}/invites", status_code=status.HTTP_201_CREATED)
def create_invite(
    organization_id: UUID,
    body: CreateInviteBody,
    user_id: str = Depends(require_current_user),
):
    """Create a pending invite. Admin/owner only. Invitation email TBD Phase 2."""
    ensure_org_admin(organization_id, user_id)
    client = get_supabase_client()
    row = {
        "organization_id": str(organization_id),
        "email": body.email,
        "role": body.role,
        "invited_by_user_id": user_id,
    }
    r = client.table("organization_invites").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite failed (maybe already invited or already a member)",
        )
    return r.data[0]
