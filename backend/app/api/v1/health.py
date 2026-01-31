"""Health check — for deployment and load balancers."""

from fastapi import APIRouter

router = APIRouter()


@router.get("", status_code=200)
def health() -> dict[str, str]:
    """Liveness/readiness. Returns 200 when the API is up."""
    return {"status": "ok"}
