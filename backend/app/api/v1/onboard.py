"""Onboarding: create first organization + membership for authenticated user (P1-AUTH-003)."""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies import require_current_user
from app.supabase_client import get_supabase_client

router = APIRouter()

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$")


class OnboardBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    slug: str = Field(..., min_length=1, max_length=64)


@router.get("/me", status_code=200)
async def get_me_and_organizations(
    user_id: str = Depends(require_current_user),
):
    """Return current user id and list of organizations they belong to (for app shell / org switcher)."""
    client = get_supabase_client()
    members = (
        client.table("organization_members")
        .select("organization_id, role")
        .eq("user_id", user_id)
        .execute()
    )
    org_ids = [m["organization_id"] for m in (members.data or [])]
    if not org_ids:
        return {"user_id": user_id, "organizations": []}
    orgs = (
        client.table("organizations")
        .select("id, name, slug, created_at")
        .in_("id", org_ids)
        .execute()
    )
    org_list = list(orgs.data or [])
    by_id = {m["organization_id"]: m["role"] for m in (members.data or [])}
    for o in org_list:
        o["role"] = by_id.get(o["id"], "member")
    return {"user_id": user_id, "organizations": org_list}


@router.post("", status_code=201)
async def create_workspace(
    body: OnboardBody,
    user_id: str = Depends(require_current_user),
):
    """Create the user's first organization and add them as owner. Idempotent if already a member of any org."""
    name = body.name.strip()
    slug = body.slug.strip().lower()
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="slug must be lowercase alphanumeric and hyphens, 1–64 chars",
        )
    client = get_supabase_client()
    members = (
        client.table("organization_members")
        .select("organization_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if members.data and len(members.data) > 0:
        org_id = members.data[0]["organization_id"]
        org = (
            client.table("organizations")
            .select("*")
            .eq("id", org_id)
            .limit(1)
            .execute()
        )
        if org.data:
            return {"organization": org.data[0], "already_exists": True}

    existing = (
        client.table("organizations")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .execute()
    )
    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="slug already taken",
        )

    org_row = (
        client.table("organizations")
        .insert({"name": name, "slug": slug})
        .execute()
    )
    if not org_row.data or len(org_row.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create organization",
        )
    org = org_row.data[0]
    org_id = org["id"]
    client.table("organization_members").insert(
        {
            "organization_id": org_id,
            "user_id": user_id,
            "role": "owner",
        }
    ).execute()
    return {"organization": org, "already_exists": False}
