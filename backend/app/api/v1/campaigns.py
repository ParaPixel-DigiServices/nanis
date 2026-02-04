"""P2-CAMP-001: Campaigns — list, get, create, update; target_rules and recipients.
P2-SES-002: Send campaign batch via SES (prepare + send)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.dependencies import ensure_org_member, require_current_user
from app.services.campaign_send import (
    DEFAULT_RATE_PER_SEC,
    prepare_campaign_recipients,
    send_campaign_batch,
)
from app.supabase_client import get_supabase_client

router = APIRouter()


class CreateCampaignBody(BaseModel):
    name: str
    template_id: UUID | None = None
    subject_line: str | None = None
    scheduled_at: str | None = None  # ISO datetime


class UpdateCampaignBody(BaseModel):
    name: str | None = None
    template_id: UUID | None = None
    subject_line: str | None = None
    scheduled_at: str | None = None
    status: str | None = None


class TargetRulesBody(BaseModel):
    include_tags: list[str] | None = None
    exclude_tags: list[str] | None = None
    exclude_countries: list[str] | None = None
    exclude_unsubscribed: bool = True
    exclude_inactive: bool = True
    exclude_bounced: bool = False


@router.get("/organizations/{organization_id}/campaigns")
def list_campaigns(
    organization_id: UUID,
    status_filter: str | None = Query(
        None, alias="status", description="draft, scheduled, sending, sent, failed, paused"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(require_current_user),
):
    """List campaigns for the org. Optional status filter."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    q = (
        client.table("campaigns")
        .select("id, organization_id, name, status, template_id, subject_line, scheduled_at, sent_at, created_at, updated_at", count="exact")
        .eq("organization_id", str(organization_id))
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status_filter:
        q = q.eq("status", status_filter)
    r = q.execute()
    return {"campaigns": r.data or [], "total": r.count or 0}


@router.get("/organizations/{organization_id}/campaigns/{campaign_id}")
def get_campaign(
    organization_id: UUID,
    campaign_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Get a campaign by id."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("campaigns")
        .select("*")
        .eq("id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .limit(1)
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return r.data[0]


@router.post("/organizations/{organization_id}/campaigns", status_code=status.HTTP_201_CREATED)
def create_campaign(
    organization_id: UUID,
    body: CreateCampaignBody,
    user_id: str = Depends(require_current_user),
):
    """Create a draft campaign."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    row = {
        "organization_id": str(organization_id),
        "name": body.name.strip(),
        "status": "draft",
        "created_by": user_id,
    }
    if body.template_id is not None:
        row["template_id"] = str(body.template_id)
    if body.subject_line is not None:
        row["subject_line"] = body.subject_line
    if body.scheduled_at is not None:
        row["scheduled_at"] = body.scheduled_at
    r = client.table("campaigns").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create campaign")
    return r.data[0]


@router.patch("/organizations/{organization_id}/campaigns/{campaign_id}")
def update_campaign(
    organization_id: UUID,
    campaign_id: UUID,
    body: UpdateCampaignBody,
    user_id: str = Depends(require_current_user),
):
    """Update a campaign (draft/scheduled/paused only). Only provided fields updated."""
    ensure_org_member(organization_id, user_id)
    payload = body.model_dump(exclude_unset=True)
    if payload.get("status") and payload["status"] not in ("draft", "scheduled", "paused"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status can only be set to draft, scheduled, or paused via API",
        )
    client = get_supabase_client()
    if not payload:
        r = (
            client.table("campaigns")
            .select("*")
            .eq("id", str(campaign_id))
            .eq("organization_id", str(organization_id))
            .limit(1)
            .execute()
        )
        if not r.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        return r.data[0]
    r = (
        client.table("campaigns")
        .update(payload)
        .eq("id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    if not r.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return r.data[0]


@router.get("/organizations/{organization_id}/campaigns/{campaign_id}/target-rules")
def get_campaign_target_rules(
    organization_id: UUID,
    campaign_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Get target rules for a campaign. Creates default row if missing."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("campaign_target_rules")
        .select("*")
        .eq("campaign_id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .limit(1)
        .execute()
    )
    if r.data and len(r.data) > 0:
        return r.data[0]
    row = {
        "campaign_id": str(campaign_id),
        "organization_id": str(organization_id),
        "exclude_unsubscribed": True,
        "exclude_inactive": True,
        "exclude_bounced": False,
    }
    r2 = client.table("campaign_target_rules").insert(row).execute()
    if r2.data and len(r2.data) > 0:
        return r2.data[0]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                        detail="Campaign not found")


@router.put("/organizations/{organization_id}/campaigns/{campaign_id}/target-rules")
def upsert_campaign_target_rules(
    organization_id: UUID,
    campaign_id: UUID,
    body: TargetRulesBody,
    user_id: str = Depends(require_current_user),
):
    """Create or update target rules for a campaign. One row per campaign."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("campaign_target_rules")
        .select("id")
        .eq("campaign_id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .limit(1)
        .execute()
    )
    payload = {
        "include_tags": body.include_tags,
        "exclude_tags": body.exclude_tags,
        "exclude_countries": body.exclude_countries,
        "exclude_unsubscribed": body.exclude_unsubscribed,
        "exclude_inactive": body.exclude_inactive,
        "exclude_bounced": body.exclude_bounced,
    }
    if r.data and len(r.data) > 0:
        up = (
            client.table("campaign_target_rules")
            .update(payload)
            .eq("campaign_id", str(campaign_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )
        if up.data:
            return up.data[0]
    row = {
        "campaign_id": str(campaign_id),
        "organization_id": str(organization_id),
        **payload,
    }
    ins = client.table("campaign_target_rules").insert(row).execute()
    if not ins.data or len(ins.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to save target rules")
    return ins.data[0]


@router.get("/organizations/{organization_id}/campaigns/{campaign_id}/recipients")
def list_campaign_recipients(
    organization_id: UUID,
    campaign_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status_filter: str | None = Query(None, alias="status"),
    user_id: str = Depends(require_current_user),
):
    """List recipients for a campaign. Optional status filter (pending, sent, delivered, bounced, opened, clicked)."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    q = (
        client.table("campaign_recipients")
        .select("id, campaign_id, contact_id, status, sent_at, bounced_at, opened_at, clicked_at, created_at", count="exact")
        .eq("campaign_id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status_filter:
        q = q.eq("status", status_filter)
    r = q.execute()
    return {"recipients": r.data or [], "total": r.count or 0}


@router.post("/organizations/{organization_id}/campaigns/{campaign_id}/prepare")
def prepare_campaign(
    organization_id: UUID,
    campaign_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Resolve recipients from target_rules and insert into campaign_recipients (pending)."""
    ensure_org_member(organization_id, user_id)
    count = prepare_campaign_recipients(campaign_id, organization_id)
    return {"recipients_count": count}


@router.post("/organizations/{organization_id}/campaigns/{campaign_id}/send")
def send_campaign(
    organization_id: UUID,
    campaign_id: UUID,
    dry_run: bool = Query(
        False, description="If true, only prepare; do not send"),
    rate_per_sec: float = Query(
        DEFAULT_RATE_PER_SEC,
        ge=0.1,
        le=14,
        description="SES rate: messages per second (1 for sandbox, up to 14 in production)",
    ),
    user_id: str = Depends(require_current_user),
):
    """Prepare recipients if needed, then send campaign emails via SES. Returns sent/failed summary."""
    ensure_org_member(organization_id, user_id)
    if dry_run:
        count = prepare_campaign_recipients(campaign_id, organization_id)
        return {"dry_run": True, "recipients_count": count}
    try:
        result = send_campaign_batch(
            campaign_id, organization_id, rate_per_sec=rate_per_sec)
        return result
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


@router.get("/organizations/{organization_id}/campaigns/{campaign_id}/analytics")
def get_campaign_analytics(
    organization_id: UUID,
    campaign_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """P2-AN-001: Per-campaign aggregates — sent, opens, clicks, open_rate, click_rate (org-scoped)."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("campaign_recipients")
        .select("id, sent_at, opened_at, clicked_at")
        .eq("campaign_id", str(campaign_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    rows = r.data or []
    sent_count = sum(1 for x in rows if x.get("sent_at"))
    open_count = sum(1 for x in rows if x.get("opened_at"))
    click_count = sum(1 for x in rows if x.get("clicked_at"))
    open_rate = (open_count / sent_count) if sent_count else 0.0
    click_rate = (click_count / sent_count) if sent_count else 0.0
    return {
        "campaign_id": str(campaign_id),
        "organization_id": str(organization_id),
        "sent_count": sent_count,
        "open_count": open_count,
        "click_count": click_count,
        "open_rate": round(open_rate, 4),
        "click_rate": round(click_rate, 4),
    }
