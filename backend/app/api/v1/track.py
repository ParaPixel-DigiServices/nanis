"""P2-SES-004: Track open/click — public endpoints (no auth); record events and return pixel or redirect."""

from datetime import datetime, timezone
from urllib.parse import unquote

from fastapi import APIRouter, Query, Response
from starlette.responses import RedirectResponse

from app.supabase_client import get_supabase_client
from app.tracking import verify_tracking_token

router = APIRouter()

TRACKING_PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00"
    b"\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


@router.get("/open")
def track_open(r: str = Query(..., alias="r")):
    """Record open event; return 1x1 transparent GIF. No auth — token in query."""
    recipient_id = verify_tracking_token(r)
    if not recipient_id:
        return Response(content=TRACKING_PIXEL_GIF, media_type="image/gif")
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    r_row = (
        client.table("campaign_recipients")
        .select("id, campaign_id, organization_id, opened_at")
        .eq("id", recipient_id)
        .limit(1)
        .execute()
    )
    if r_row.data and len(r_row.data) > 0:
        row = r_row.data[0]
        if not row.get("opened_at"):
            client.table("campaign_recipients").update({"opened_at": now_iso}).eq(
                "id", recipient_id
            ).execute()
            client.table("email_events").insert({
                "campaign_id": row["campaign_id"],
                "campaign_recipient_id": recipient_id,
                "organization_id": row["organization_id"],
                "event_type": "open",
                "link_url": None,
            }).execute()
    return Response(content=TRACKING_PIXEL_GIF, media_type="image/gif")


@router.get("/click")
def track_click(
    r: str = Query(..., alias="r"),
    url: str = Query("", alias="url"),
):
    """Record click event; redirect to original URL. No auth — token in query."""
    recipient_id = verify_tracking_token(r)
    target = unquote(url) if url else "/"
    if not recipient_id:
        return RedirectResponse(url=target, status_code=302)
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    r_row = (
        client.table("campaign_recipients")
        .select("id, campaign_id, organization_id, clicked_at")
        .eq("id", recipient_id)
        .limit(1)
        .execute()
    )
    if r_row.data and len(r_row.data) > 0:
        row = r_row.data[0]
        if not row.get("clicked_at"):
            client.table("campaign_recipients").update({"clicked_at": now_iso}).eq(
                "id", recipient_id
            ).execute()
            client.table("email_events").insert({
                "campaign_id": row["campaign_id"],
                "campaign_recipient_id": recipient_id,
                "organization_id": row["organization_id"],
                "event_type": "click",
                "link_url": target or None,
            }).execute()
    return RedirectResponse(url=target, status_code=302)
