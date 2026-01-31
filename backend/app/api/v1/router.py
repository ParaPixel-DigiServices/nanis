"""API v1 router — health, activity, invites, etc."""

from fastapi import APIRouter

from app.api.v1 import activity, health, invites

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(activity.router, tags=["activity"])
router.include_router(invites.router, tags=["invites"])
