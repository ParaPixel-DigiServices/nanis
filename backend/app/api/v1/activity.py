"""P1-DASH-002: Activity feed — read and insert events for current org."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.dependencies import require_current_user
from app.supabase_client import get_supabase_client

router = APIRouter()


class CreateEventBody(BaseModel):
    event_type: str
    payload: dict = {}


def _ensure_org_member(org_id: UUID, user_id: str) -> None:
    """Raise 403 if user is not a member of the org."""
    client = get_supabase_client()
    r = (
        client.table("organization_members")
        .select("id")
        .eq("organization_id", str(org_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )


@router.get("/organizations/{organization_id}/activity")
def list_activity(
    organization_id: UUID,
    limit: int = 20,
    user_id: str = Depends(require_current_user),
):
    """Return recent activity events for the organization. Requires auth and org membership."""
    _ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("activity_events")
        .select("id, organization_id, user_id, event_type, payload, created_at")
        .eq("organization_id", str(organization_id))
        .order("created_at", desc=True)
        .limit(min(limit, 100))
        .execute()
    )
    return {"events": r.data or []}


@router.post("/organizations/{organization_id}/activity", status_code=status.HTTP_201_CREATED)
def create_activity_event(
    organization_id: UUID,
    body: CreateEventBody,
    user_id: str = Depends(require_current_user),
):
    """Insert an activity event for the org (insert helper). Requires auth and org membership."""
    _ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    row = {
        "organization_id": str(organization_id),
        "user_id": user_id,
        "event_type": body.event_type,
        "payload": body.payload or {},
    }
    r = client.table("activity_events").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create event")
    return r.data[0]
