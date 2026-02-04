"""P2-TPL-001: Templates — list (org + admin_provided), get, create, update, delete."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.dependencies import ensure_org_member, require_current_user
from app.supabase_client import get_supabase_client

router = APIRouter()


class CreateTemplateBody(BaseModel):
    name: str
    content_html: str | None = None
    content_json: dict | None = None
    subject_line: str | None = None


class UpdateTemplateBody(BaseModel):
    name: str | None = None
    content_html: str | None = None
    content_json: dict | None = None
    subject_line: str | None = None


@router.get("/organizations/{organization_id}/templates")
def list_templates(
    organization_id: UUID,
    include_admin_provided: bool = Query(
        True, description="Include global admin templates (org_id NULL)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(require_current_user),
):
    """List templates: org's user-created + optionally admin-provided (organization_id IS NULL)."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    q = (
        client.table("templates")
        .select("id, organization_id, name, admin_provided, subject_line, created_at, updated_at", count="exact")
        .eq("organization_id", str(organization_id))
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    r = q.execute()
    items = list(r.data or [])
    total = r.count or 0
    if include_admin_provided:
        r2 = (
            client.table("templates")
            .select("id, organization_id, name, admin_provided, subject_line, created_at, updated_at")
            .is_("organization_id", "null")
            .eq("admin_provided", True)
            .order("name")
            .execute()
        )
        admin = list(r2.data or [])
        items = items + admin
        total = total + len(admin)
    return {"templates": items, "total": total}


@router.get("/organizations/{organization_id}/templates/{template_id}")
def get_template(
    organization_id: UUID,
    template_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Get a template by id. Readable if org-owned or admin_provided (global)."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("templates")
        .select("*")
        .eq("id", str(template_id))
        .limit(1)
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    row = r.data[0]
    if row.get("organization_id") and str(row["organization_id"]) != str(organization_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return row


@router.post("/organizations/{organization_id}/templates", status_code=status.HTTP_201_CREATED)
def create_template(
    organization_id: UUID,
    body: CreateTemplateBody,
    user_id: str = Depends(require_current_user),
):
    """Create a user template for the org. At least content_html or content_json required."""
    ensure_org_member(organization_id, user_id)
    if not body.content_html and not body.content_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of content_html or content_json is required",
        )
    client = get_supabase_client()
    row = {
        "organization_id": str(organization_id),
        "name": body.name.strip(),
        "admin_provided": False,
        "created_by": user_id,
    }
    if body.content_html is not None:
        row["content_html"] = body.content_html
    if body.content_json is not None:
        row["content_json"] = body.content_json
    if body.subject_line is not None:
        row["subject_line"] = body.subject_line
    r = client.table("templates").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create template")
    return r.data[0]


@router.patch("/organizations/{organization_id}/templates/{template_id}")
def update_template(
    organization_id: UUID,
    template_id: UUID,
    body: UpdateTemplateBody,
    user_id: str = Depends(require_current_user),
):
    """Update a user-created template. Cannot update admin_provided templates."""
    ensure_org_member(organization_id, user_id)
    payload = body.model_dump(exclude_unset=True)
    client = get_supabase_client()
    if not payload:
        r = (
            client.table("templates")
            .select("*")
            .eq("id", str(template_id))
            .eq("organization_id", str(organization_id))
            .limit(1)
            .execute()
        )
        if not r.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return r.data[0]
    r = (
        client.table("templates")
        .update(payload)
        .eq("id", str(template_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    if not r.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return r.data[0]


@router.delete("/organizations/{organization_id}/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    organization_id: UUID,
    template_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Delete a user-created template. Admin-provided templates cannot be deleted."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("templates")
        .delete()
        .eq("id", str(template_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    return None
