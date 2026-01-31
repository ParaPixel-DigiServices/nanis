"""API v1 router — health, and future modules (auth, orgs, contacts, etc.)."""

from fastapi import APIRouter

from app.api.v1 import health

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
