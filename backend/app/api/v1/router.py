"""API v1 router — health, activity, invites, contacts, templates, campaigns."""

from fastapi import APIRouter

from app.api.v1 import activity, campaigns, contacts, health, invites, templates

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(activity.router, tags=["activity"])
router.include_router(invites.router, tags=["invites"])
router.include_router(contacts.router, tags=["contacts"])
router.include_router(templates.router, tags=["templates"])
router.include_router(campaigns.router, tags=["campaigns"])
