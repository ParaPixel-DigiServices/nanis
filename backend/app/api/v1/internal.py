"""P2-SES-003: Internal/cron endpoints — process scheduled campaigns. Not for frontend."""

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.config import get_settings
from app.services.campaign_send import (
    DEFAULT_RATE_PER_SEC,
    process_scheduled_campaigns,
)

router = APIRouter()


def _check_cron_secret(x_cron_secret: str | None = Header(None, alias="X-Cron-Secret")) -> None:
    """Raise 401 if X-Cron-Secret missing or wrong; 503 if cron not configured."""
    settings = get_settings()
    if not (settings.cron_secret or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scheduler not configured (CRON_SECRET not set)",
        )
    if not x_cron_secret or x_cron_secret.strip() != settings.cron_secret.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Cron-Secret",
        )


@router.post("/process-scheduled-campaigns")
def trigger_process_scheduled_campaigns(
    x_cron_secret: str | None = Header(None, alias="X-Cron-Secret"),
    max_campaigns: int = Query(5, ge=1, le=20),
    rate_per_sec: float = Query(DEFAULT_RATE_PER_SEC, ge=0.1, le=14),
):
    """
    P2-SES-003: Process campaigns with status=scheduled and scheduled_at <= now().
    Call this from a cron job every 1–5 minutes. Requires X-Cron-Secret header.
    """
    _check_cron_secret(x_cron_secret)
    processed = process_scheduled_campaigns(
        max_campaigns=max_campaigns,
        rate_per_sec=rate_per_sec,
    )
    return {"processed": processed}
