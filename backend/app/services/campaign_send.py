"""P2-SES-002: Resolve recipients from target_rules, render template, send via SES in batches."""

import re
import time
from datetime import datetime, timezone
from uuid import UUID

from app.config import get_settings
from app.ses_client import send_email
from app.supabase_client import get_supabase_client

# Default: 1 send per second (SES sandbox). Increase after production access.
DEFAULT_RATE_PER_SEC = 1.0


def _render_vars(text: str, contact: dict) -> str:
    """Replace {{first_name}}, {{email}}, etc. with contact fields."""
    if not text:
        return text
    result = text
    for key, val in contact.items():
        if val is None:
            val = ""
        result = result.replace("{{" + key + "}}", str(val))
    # Strip any remaining {{...}}
    result = re.sub(r"\{\{[^}]+\}\}", "", result)
    return result


def resolve_recipients(campaign_id: UUID, organization_id: UUID) -> list[dict]:
    """
    Resolve contacts that match campaign target_rules.
    Returns list of contact dicts (id, email, first_name, last_name, country) with email set.
    """
    client = get_supabase_client()
    org_id = str(organization_id)
    camp_id = str(campaign_id)

    # Load campaign and target_rules
    r_camp = (
        client.table("campaigns")
        .select("id, template_id, subject_line")
        .eq("id", camp_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not r_camp.data:
        return []

    r_rules = (
        client.table("campaign_target_rules")
        .select("*")
        .eq("campaign_id", camp_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    rules = (r_rules.data or [{}])[0] if r_rules.data else {}
    exclude_unsubscribed = rules.get("exclude_unsubscribed", True)
    exclude_inactive = rules.get("exclude_inactive", True)
    exclude_bounced = rules.get("exclude_bounced", False)
    exclude_countries = rules.get("exclude_countries") or []
    include_tags = rules.get("include_tags") or []
    exclude_tags = rules.get("exclude_tags") or []

    # Base contacts: org, has email, not deleted
    q = (
        client.table("contacts")
        .select("id, email, first_name, last_name, country")
        .eq("organization_id", org_id)
        .not_.is_("email", "null")
        .is_("deleted_at", "null")
    )
    if exclude_inactive:
        q = q.eq("is_active", True)
    if exclude_unsubscribed:
        q = q.eq("is_subscribed", True)
    r_contacts = q.execute()
    contacts = list(r_contacts.data or [])
    if not contacts:
        return []

    # Filter by country
    if exclude_countries:
        exclude_set = {c.strip().lower() for c in exclude_countries if c}
        contacts = [c for c in contacts if not (
            c.get("country") or "").strip().lower() in exclude_set]

    # Include tags: keep only contacts that have at least one tag in include_tags
    if include_tags:
        tag_names = [t.strip() for t in include_tags if t]
        if tag_names:
            r_tags = (
                client.table("contact_tags")
                .select("id")
                .eq("organization_id", org_id)
                .in_("name", tag_names)
                .execute()
            )
            tag_ids = [t["id"] for t in (r_tags.data or [])]
            if tag_ids:
                r_assign = (
                    client.table("contact_tag_assignments")
                    .select("contact_id")
                    .in_("tag_id", tag_ids)
                    .execute()
                )
                allowed_ids = {a["contact_id"] for a in (r_assign.data or [])}
                contacts = [c for c in contacts if c["id"] in allowed_ids]
            else:
                contacts = []

    # Exclude tags: remove contacts that have any tag in exclude_tags
    if exclude_tags and contacts:
        tag_names = [t.strip() for t in exclude_tags if t]
        if tag_names:
            r_tags = (
                client.table("contact_tags")
                .select("id")
                .eq("organization_id", org_id)
                .in_("name", tag_names)
                .execute()
            )
            tag_ids = [t["id"] for t in (r_tags.data or [])]
            if tag_ids:
                r_assign = (
                    client.table("contact_tag_assignments")
                    .select("contact_id")
                    .in_("tag_id", tag_ids)
                    .execute()
                )
                excluded_ids = {a["contact_id"] for a in (r_assign.data or [])}
                contacts = [c for c in contacts if c["id"] not in excluded_ids]

    # Exclude bounced (contact_ids that have bounced in this org)
    if exclude_bounced and contacts:
        r_bounced = (
            client.table("campaign_recipients")
            .select("contact_id")
            .eq("organization_id", org_id)
            .eq("status", "bounced")
            .execute()
        )
        bounced_ids = {b["contact_id"] for b in (r_bounced.data or [])}
        contacts = [c for c in contacts if c["id"] not in bounced_ids]

    # Normalize keys for template (first_name, last_name, email, country)
    out = []
    for c in contacts:
        out.append({
            "id": c["id"],
            "email": (c.get("email") or "").strip(),
            "first_name": (c.get("first_name") or "").strip(),
            "last_name": (c.get("last_name") or "").strip(),
            "country": (c.get("country") or "").strip(),
        })
    return [x for x in out if x["email"]]


def prepare_campaign_recipients(campaign_id: UUID, organization_id: UUID) -> int:
    """Insert resolved contacts into campaign_recipients (status=pending). Returns count of recipients."""
    client = get_supabase_client()
    org_id = str(organization_id)
    camp_id = str(campaign_id)
    contacts = resolve_recipients(campaign_id, organization_id)
    for c in contacts:
        row = {
            "campaign_id": camp_id,
            "contact_id": c["id"],
            "organization_id": org_id,
            "status": "pending",
        }
        try:
            client.table("campaign_recipients").insert(row).execute()
        except Exception:
            pass  # duplicate (campaign_id, contact_id) — skip
    return len(contacts)


def send_campaign_batch(
    campaign_id: UUID,
    organization_id: UUID,
    rate_per_sec: float = DEFAULT_RATE_PER_SEC,
) -> dict:
    """
    Prepare recipients if needed, then send to all pending via SES.
    Returns { "sent": n, "failed": n, "errors": [...] }.
    """
    client = get_supabase_client()
    org_id = str(organization_id)
    camp_id = str(campaign_id)

    # Load campaign and template
    r_camp = (
        client.table("campaigns")
        .select("id, template_id, subject_line, status")
        .eq("id", camp_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not r_camp.data:
        return {"sent": 0, "failed": 0, "errors": [{"reason": "Campaign not found"}]}
    campaign = r_camp.data[0]
    if campaign["status"] not in ("draft", "scheduled"):
        return {"sent": 0, "failed": 0, "errors": [{"reason": "Campaign already sent or not sendable"}]}

    template_id = campaign.get("template_id")
    if not template_id:
        return {"sent": 0, "failed": 0, "errors": [{"reason": "Campaign has no template"}]}

    r_tpl = (
        client.table("templates")
        .select("content_html, subject_line")
        .eq("id", str(template_id))
        .limit(1)
        .execute()
    )
    if not r_tpl.data:
        return {"sent": 0, "failed": 0, "errors": [{"reason": "Template not found"}]}
    template = r_tpl.data[0]
    body_html = template.get("content_html") or "<p>No content</p>"
    subject = (campaign.get("subject_line") or template.get(
        "subject_line") or "Campaign").strip()

    # Ensure recipients are prepared
    r_pending = (
        client.table("campaign_recipients")
        .select("id, contact_id")
        .eq("campaign_id", camp_id)
        .eq("organization_id", org_id)
        .eq("status", "pending")
        .execute()
    )
    pending = r_pending.data or []
    if not pending:
        prepare_campaign_recipients(campaign_id, organization_id)
        r_pending = (
            client.table("campaign_recipients")
            .select("id, contact_id")
            .eq("campaign_id", camp_id)
            .eq("organization_id", org_id)
            .eq("status", "pending")
            .execute()
        )
        pending = r_pending.data or []
    if not pending:
        return {"sent": 0, "failed": 0, "errors": [], "message": "No recipients to send"}

    # Mark campaign as sending
    client.table("campaigns").update({"status": "sending"}).eq(
        "id", camp_id).eq("organization_id", org_id).execute()

    contact_ids = [p["contact_id"] for p in pending]
    r_contacts = (
        client.table("contacts")
        .select("id, email, first_name, last_name, country")
        .in_("id", contact_ids)
        .execute()
    )
    contacts_by_id = {c["id"]: c for c in (r_contacts.data or [])}
    now_iso = datetime.now(timezone.utc).isoformat()
    sent = 0
    failed = 0
    errors: list[dict] = []
    delay = 1.0 / rate_per_sec if rate_per_sec > 0 else 0

    for rec in pending:
        cid = rec["contact_id"]
        contact = contacts_by_id.get(cid)
        if not contact or not (contact.get("email") or "").strip():
            failed += 1
            errors.append(
                {"contact_id": cid, "reason": "Contact or email missing"})
            continue
        email = (contact["email"] or "").strip()
        ctx = {
            "first_name": contact.get("first_name") or "",
            "last_name": contact.get("last_name") or "",
            "email": email,
            "country": contact.get("country") or "",
        }
        try:
            send_email(
                to_address=email,
                subject=_render_vars(subject, ctx),
                body_html=_render_vars(body_html, ctx),
            )
            client.table("campaign_recipients").update(
                {"status": "sent", "sent_at": now_iso}
            ).eq("id", rec["id"]).execute()
            sent += 1
        except Exception as e:
            failed += 1
            errors.append({"contact_id": str(cid), "reason": str(e)[:200]})
        if delay > 0:
            time.sleep(delay)

    # Update campaign status
    new_status = "failed" if failed > 0 and sent == 0 else "sent"
    client.table("campaigns").update({
        "status": new_status,
        "sent_at": now_iso,
    }).eq("id", camp_id).eq("organization_id", org_id).execute()

    return {"sent": sent, "failed": failed, "errors": errors[:100]}
