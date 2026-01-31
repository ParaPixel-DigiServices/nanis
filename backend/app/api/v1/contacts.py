"""P2-CRM-001: Contacts + tags — list, create, update, delete; tag CRUD and assignments.
P2-CRM-004: CSV import pipeline — upload CSV, map columns, bulk create contacts, return report."""

import csv
import io
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import Query
from fastapi import UploadFile
from fastapi import status

from pydantic import BaseModel, EmailStr

from app.dependencies import ensure_org_member, require_current_user
from app.supabase_client import get_supabase_client

router = APIRouter()

# ---------------------------------------------------------------------------
# Contacts
# ---------------------------------------------------------------------------


class CreateContactBody(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    mobile: str | None = None
    country: str | None = None
    source: str = "manual"
    is_active: bool = True
    is_subscribed: bool = True


class UpdateContactBody(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    mobile: str | None = None
    country: str | None = None
    is_active: bool | None = None
    is_subscribed: bool | None = None


def _contact_row(organization_id: UUID, body: CreateContactBody, created_by: str) -> dict:
    row: dict = {
        "organization_id": str(organization_id),
        "source": body.source,
        "is_active": body.is_active,
        "is_subscribed": body.is_subscribed,
        "created_by": created_by,
    }
    if body.email is not None:
        row["email"] = body.email
    if body.first_name is not None:
        row["first_name"] = body.first_name
    if body.last_name is not None:
        row["last_name"] = body.last_name
    if body.mobile is not None:
        row["mobile"] = body.mobile
    if body.country is not None:
        row["country"] = body.country
    if not row.get("email") and not row.get("mobile"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of email or mobile is required",
        )
    return row


@router.get("/organizations/{organization_id}/contacts")
def list_contacts(
    organization_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = None,
    user_id: str = Depends(require_current_user),
):
    """List contacts for the org. Pagination: limit, offset. Optional search on email/name."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    q = (
        client.table("contacts")
        .select("id, organization_id, email, first_name, last_name, mobile, country, source, is_active, is_subscribed, created_at, updated_at", count="exact")
        .eq("organization_id", str(organization_id))
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if search and search.strip():
        # Simple search: OR ilike on email, first_name, last_name
        q = q.or_(
            f"email.ilike.%{search.strip()}%,first_name.ilike.%{search.strip()}%,last_name.ilike.%{search.strip()}%")
    r = q.execute()
    return {"contacts": r.data or [], "total": r.count or 0}


@router.get("/organizations/{organization_id}/contacts/{contact_id}")
def get_contact(
    organization_id: UUID,
    contact_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Get a single contact by id. 404 if not in org or deleted."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("contacts")
        .select("*")
        .eq("id", str(contact_id))
        .eq("organization_id", str(organization_id))
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return r.data[0]


@router.post("/organizations/{organization_id}/contacts", status_code=status.HTTP_201_CREATED)
def create_contact(
    organization_id: UUID,
    body: CreateContactBody,
    user_id: str = Depends(require_current_user),
):
    """Create a contact. At least email or mobile required."""
    ensure_org_member(organization_id, user_id)
    row = _contact_row(organization_id, body, user_id)
    client = get_supabase_client()
    r = client.table("contacts").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create failed (e.g. duplicate email in org)",
        )
    return r.data[0]


@router.patch("/organizations/{organization_id}/contacts/{contact_id}")
def update_contact(
    organization_id: UUID,
    contact_id: UUID,
    body: UpdateContactBody,
    user_id: str = Depends(require_current_user),
):
    """Update a contact. Only provided fields are updated."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        r = (
            client.table("contacts")
            .select("*")
            .eq("id", str(contact_id))
            .eq("organization_id", str(organization_id))
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        if not r.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        return r.data[0]
    r = (
        client.table("contacts")
        .update(payload)
        .eq("id", str(contact_id))
        .eq("organization_id", str(organization_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return r.data[0]


@router.delete("/organizations/{organization_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    organization_id: UUID,
    contact_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Soft-delete a contact (set deleted_at)."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("contacts")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", str(contact_id))
        .eq("organization_id", str(organization_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return None


# ---------------------------------------------------------------------------
# P2-CRM-004: CSV import
# ---------------------------------------------------------------------------

CONTACT_IMPORT_FIELDS = ("email", "first_name",
                         "last_name", "mobile", "country")
MAX_IMPORT_ROWS = 2000

# Common CSV header names → our field name (case-insensitive match)
_HEADER_ALIASES = {
    "email": ["email", "e-mail", "mail"],
    "first_name": ["first_name", "first name", "firstname", "given name"],
    "last_name": ["last_name", "last name", "lastname", "surname", "family name"],
    "mobile": ["mobile", "phone", "telephone", "cell", "number"],
    "country": ["country", "country code", "location"],
}


def _normalize_header(h: str) -> str:
    return (h or "").strip().lower().replace(" ", "_").replace("-", "_")


def _infer_column_mapping(csv_headers: list[str]) -> dict[str, int]:
    """Map our field names to column indices using CSV headers. Returns field_name -> index."""
    mapping: dict[str, int] = {}
    normalized_headers = [_normalize_header(h) for h in csv_headers]
    for field in CONTACT_IMPORT_FIELDS:
        for alias in _HEADER_ALIASES.get(field, [field]):
            norm = _normalize_header(alias)
            for i, nh in enumerate(normalized_headers):
                if nh == norm or nh == field.replace("_", ""):
                    mapping[field] = i
                    break
            if field in mapping:
                break
    return mapping


def _validate_email(s: str | None) -> bool:
    if not s or not s.strip():
        return False
    s = s.strip()
    return "@" in s and "." in s and len(s) > 3


@router.post("/organizations/{organization_id}/contacts/import")
def import_contacts_csv(
    organization_id: UUID,
    file: UploadFile = File(...,
                            description="CSV file (headers in first row)"),
    column_mapping: str | None = Form(
        None, description="Optional JSON: our_field -> CSV header"),
    source: str = Form(
        "csv_import", description="Source label for imported contacts"),
    user_id: str = Depends(require_current_user),
):
    """P2-CRM-004: Upload CSV, map columns, create contacts under org. Returns created/failed + errors."""
    ensure_org_member(organization_id, user_id)
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV (.csv)",
        )
    content = file.file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("utf-8-sig")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV must be UTF-8 encoded",
            )
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV is empty",
        )
    headers = [h.strip() for h in rows[0]]
    data_rows = rows[1:]
    if len(data_rows) > MAX_IMPORT_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_IMPORT_ROWS} rows per import",
        )
    if column_mapping:
        try:
            user_map = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="column_mapping must be valid JSON object: { \"email\": \"Email\", ... }",
            )
        field_to_index: dict[str, int] = {}
        for our_field, csv_header in user_map.items():
            if our_field not in CONTACT_IMPORT_FIELDS:
                continue
            for i, h in enumerate(headers):
                if (h or "").strip() == (csv_header or "").strip():
                    field_to_index[our_field] = i
                    break
    else:
        field_to_index = _infer_column_mapping(headers)
    if not field_to_index:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not map any columns. Provide column_mapping or use headers: "
                "email, first_name, last_name, mobile, country"
            ),
        )
    client = get_supabase_client()
    created = 0
    errors: list[dict] = []
    for row_index, row in enumerate(data_rows):
        one_indexed = row_index + 2
        if not any(cell and str(cell).strip() for cell in row):
            continue
        email_val = None
        if "email" in field_to_index:
            idx = field_to_index["email"]
            if idx < len(row) and row[idx] is not None:
                email_val = str(row[idx]).strip() or None
        mobile_val = None
        if "mobile" in field_to_index:
            idx = field_to_index["mobile"]
            if idx < len(row) and row[idx] is not None:
                mobile_val = str(row[idx]).strip() or None
        if not email_val and not mobile_val:
            errors.append(
                {"row": one_indexed, "reason": "Missing email and mobile"})
            continue
        if email_val and not _validate_email(email_val):
            errors.append(
                {"row": one_indexed, "reason": "Invalid email format"})
            continue
        payload: dict = {
            "organization_id": str(organization_id),
            "source": source,
            "is_active": True,
            "is_subscribed": True,
            "created_by": user_id,
        }
        if email_val:
            payload["email"] = email_val
        if mobile_val:
            payload["mobile"] = mobile_val
        for field in ("first_name", "last_name", "country"):
            if field in field_to_index:
                idx = field_to_index[field]
                if idx < len(row) and row[idx] is not None:
                    val = str(row[idx]).strip() or None
                    if val:
                        payload[field] = val
        try:
            r = client.table("contacts").insert(payload).execute()
            if r.data and len(r.data) > 0:
                created += 1
            else:
                errors.append(
                    {"row": one_indexed,
                        "reason": "Insert failed (e.g. duplicate email)"}
                )
        except Exception as e:
            errors.append({"row": one_indexed, "reason": str(e)[:200]})
    return {
        "created": created,
        "failed": len(errors),
        "total": len(data_rows),
        "errors": errors[:100],
    }


# ---------------------------------------------------------------------------
# Contact tags
# ---------------------------------------------------------------------------

class CreateTagBody(BaseModel):
    name: str
    color: str | None = None


class UpdateTagBody(BaseModel):
    name: str | None = None
    color: str | None = None


@router.get("/organizations/{organization_id}/contacts/tags/list")
def list_contact_tags(
    organization_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """List all contact tags for the org."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("contact_tags")
        .select("id, organization_id, name, color, created_at")
        .eq("organization_id", str(organization_id))
        .order("name")
        .execute()
    )
    return {"tags": r.data or []}


@router.post("/organizations/{organization_id}/contacts/tags", status_code=status.HTTP_201_CREATED)
def create_contact_tag(
    organization_id: UUID,
    body: CreateTagBody,
    user_id: str = Depends(require_current_user),
):
    """Create a contact tag. Name must be unique per org."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    row = {
        "organization_id": str(organization_id),
        "name": body.name.strip(),
        "color": body.color or None,
        "created_by": user_id,
    }
    r = client.table("contact_tags").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create failed (e.g. tag name already exists in org)",
        )
    return r.data[0]


@router.patch("/organizations/{organization_id}/contacts/tags/{tag_id}")
def update_contact_tag(
    organization_id: UUID,
    tag_id: UUID,
    body: UpdateTagBody,
    user_id: str = Depends(require_current_user),
):
    """Update a contact tag."""
    ensure_org_member(organization_id, user_id)
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        client = get_supabase_client()
        r = (
            client.table("contact_tags")
            .select("*")
            .eq("id", str(tag_id))
            .eq("organization_id", str(organization_id))
            .limit(1)
            .execute()
        )
        if not r.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
        return r.data[0]
    client = get_supabase_client()
    r = (
        client.table("contact_tags")
        .update(payload)
        .eq("id", str(tag_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    if not r.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return r.data[0]


@router.delete("/organizations/{organization_id}/contacts/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact_tag(
    organization_id: UUID,
    tag_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Delete a contact tag. Assignments are cascade-deleted."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("contact_tags")
        .delete()
        .eq("id", str(tag_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    if r.data is None and (not r.data or len(r.data) == 0):
        # delete() may return empty; check count if needed
        pass
    return None


# ---------------------------------------------------------------------------
# Contact tag assignments
# ---------------------------------------------------------------------------

class AssignTagBody(BaseModel):
    tag_id: UUID


@router.get("/organizations/{organization_id}/contacts/{contact_id}/tags")
def list_contact_tag_assignments(
    organization_id: UUID,
    contact_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """List tags assigned to a contact."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    r = (
        client.table("contact_tag_assignments")
        .select("id, contact_id, tag_id, assigned_at")
        .eq("contact_id", str(contact_id))
        .eq("organization_id", str(organization_id))
        .execute()
    )
    # Optionally join tag name/color from contact_tags
    tag_ids = [a["tag_id"] for a in (r.data or [])]
    if not tag_ids:
        return {"assignments": [], "tags": []}
    tags_r = client.table("contact_tags").select(
        "id, name, color").in_("id", tag_ids).execute()
    tags_by_id = {t["id"]: t for t in (tags_r.data or [])}
    tags = [tags_by_id.get(a["tag_id"], {}) for a in (r.data or [])]
    return {"assignments": r.data or [], "tags": tags}


@router.post("/organizations/{organization_id}/contacts/{contact_id}/tags", status_code=status.HTTP_201_CREATED)
def assign_tag_to_contact(
    organization_id: UUID,
    contact_id: UUID,
    body: AssignTagBody,
    user_id: str = Depends(require_current_user),
):
    """Assign a tag to a contact. Tag must belong to same org."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    row = {
        "contact_id": str(contact_id),
        "tag_id": str(body.tag_id),
        "organization_id": str(organization_id),
        "assigned_by": user_id,
    }
    r = client.table("contact_tag_assignments").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assign failed (e.g. contact/tag not in org or already assigned)",
        )
    return r.data[0]


@router.delete("/organizations/{organization_id}/contacts/{contact_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_tag_from_contact(
    organization_id: UUID,
    contact_id: UUID,
    tag_id: UUID,
    user_id: str = Depends(require_current_user),
):
    """Remove a tag from a contact."""
    ensure_org_member(organization_id, user_id)
    client = get_supabase_client()
    client.table("contact_tag_assignments").delete().eq("contact_id", str(contact_id)).eq(
        "tag_id", str(tag_id)).eq("organization_id", str(organization_id)).execute()
    return None
