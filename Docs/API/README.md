# API Contract (Backend ↔ Frontend)

**Owner:** Backend. Update this doc whenever you add or change an API that the frontend will call.

The frontend uses this as the **single source of truth** for endpoints, request/response shapes, and auth.

---

## Base URL and Auth

- **Base URL:** Backend runs as FastAPI (e.g. `http://localhost:8000` locally). Frontend calls `http://localhost:8000/api/v1/...` in dev; production TBD (e.g. same host or separate API host).
- **Auth:** Endpoints that need a user require `Authorization: Bearer <supabase_access_token>`. Backend validates the Supabase JWT (HS256 with JWT Secret, or ES256 via JWKS). Document per endpoint if different.

---

## Endpoints

### Health

#### `GET /api/v1/health`

- **Description:** Health check for deployment and load balancers.
- **Auth:** Not required
- **Request:** None
- **Response:** `200` — `{ "status": "ok" }`

---

### Activity (P1-DASH-002)

#### `GET /api/v1/organizations/{organization_id}/activity`

- **Description:** Recent activity events for the organization (dashboard feed).
- **Auth:** Required
- **Request:** Path `organization_id` (UUID). Query `limit` (optional, default 20, max 100).
- **Response:** `200` — `{ "events": [ { "id", "organization_id", "user_id", "event_type", "payload", "created_at" }, ... ] }`

#### `POST /api/v1/organizations/{organization_id}/activity`

- **Description:** Insert an activity event (insert helper).
- **Auth:** Required
- **Request:** Body `{ "event_type": string, "payload": object }`
- **Response:** `201` — created event object

---

### Invites (P1-RBAC-002)

#### `GET /api/v1/organizations/{organization_id}/invites`

- **Description:** List pending invites for the organization. Owner/admin only.
- **Auth:** Required
- **Request:** Path `organization_id` (UUID).
- **Response:** `200` — `{ "invites": [ { "id", "email", "role", "invited_by_user_id", "expires_at", "created_at" }, ... ] }`

#### `POST /api/v1/organizations/{organization_id}/invites`

- **Description:** Create a pending invite. Owner/admin only. Invitation email TBD Phase 2.
- **Auth:** Required
- **Request:** Body `{ "email": string, "role": "admin" | "member" }`
- **Response:** `201` — created invite object

---

### Contacts (P2-CRM-001)

#### `GET /api/v1/organizations/{organization_id}/contacts`

- **Description:** List contacts for the org. Pagination and optional search.
- **Auth:** Required
- **Request:** Path `organization_id`. Query: `limit` (default 50, max 100), `offset` (default 0), `search` (optional).
- **Response:** `200` — `{ "contacts": [ ... ], "total": number }`

#### `GET /api/v1/organizations/{organization_id}/contacts/{contact_id}`

- **Description:** Get a single contact. 404 if deleted or wrong org.
- **Auth:** Required
- **Response:** `200` — contact object

#### `POST /api/v1/organizations/{organization_id}/contacts`

- **Description:** Create a contact. At least `email` or `mobile` required.
- **Auth:** Required
- **Request:** Body `{ "email"?, "first_name"?, "last_name"?, "mobile"?, "country"?, "source"?, "is_active"?, "is_subscribed"? }`
- **Response:** `201` — created contact

#### `PATCH /api/v1/organizations/{organization_id}/contacts/{contact_id}`

- **Description:** Update a contact. Only provided fields updated.
- **Auth:** Required
- **Response:** `200` — updated contact

#### `DELETE /api/v1/organizations/{organization_id}/contacts/{contact_id}`

- **Description:** Soft-delete a contact (sets `deleted_at`).
- **Auth:** Required
- **Response:** `204`

#### `POST /api/v1/organizations/{organization_id}/contacts/import` (P2-CRM-004)

- **Description:** CSV import: upload CSV, map columns to contact fields, create contacts under org. Returns created/failed counts and per-row errors (max 2000 rows per request).
- **Auth:** Required
- **Request:** `multipart/form-data`: `file` (CSV, UTF-8, first row = headers); optional `column_mapping` (JSON string e.g. `{"email":"Email","first_name":"First Name"}`); optional `source` (default `csv_import`). If no mapping, headers are auto-matched to email, first_name, last_name, mobile, country.
- **Response:** `200` — `{ "created": number, "failed": number, "total": number, "errors": [ { "row": number, "reason": string }, ... ] }` (errors capped at 100).

#### `GET /api/v1/organizations/{organization_id}/contacts/tags/list`

- **Description:** List all contact tags for the org.
- **Auth:** Required
- **Response:** `200` — `{ "tags": [ { "id", "organization_id", "name", "color", "created_at" }, ... ] }`

#### `POST /api/v1/organizations/{organization_id}/contacts/tags`

- **Description:** Create a contact tag. Name unique per org.
- **Auth:** Required
- **Request:** Body `{ "name": string, "color"?: string }`
- **Response:** `201` — created tag

#### `PATCH /api/v1/organizations/{organization_id}/contacts/tags/{tag_id}`

- **Description:** Update a contact tag.
- **Auth:** Required
- **Response:** `200` — updated tag

#### `DELETE /api/v1/organizations/{organization_id}/contacts/tags/{tag_id}`

- **Description:** Delete a contact tag (assignments cascade-deleted).
- **Auth:** Required
- **Response:** `204`

#### `GET /api/v1/organizations/{organization_id}/contacts/{contact_id}/tags`

- **Description:** List tags assigned to a contact.
- **Auth:** Required
- **Response:** `200` — `{ "assignments": [ ... ], "tags": [ ... ] }`

#### `POST /api/v1/organizations/{organization_id}/contacts/{contact_id}/tags`

- **Description:** Assign a tag to a contact.
- **Auth:** Required
- **Request:** Body `{ "tag_id": UUID }`
- **Response:** `201` — assignment object

#### `DELETE /api/v1/organizations/{organization_id}/contacts/{contact_id}/tags/{tag_id}`

- **Description:** Remove a tag from a contact.
- **Auth:** Required
- **Response:** `204`

---

### Templates (P2-TPL-001)

#### `GET /api/v1/organizations/{organization_id}/templates`

- **Description:** List templates: org's user-created + optionally admin-provided (global).
- **Auth:** Required
- **Request:** Query: `include_admin_provided` (default true), `limit`, `offset`.
- **Response:** `200` — `{ "templates": [ ... ], "total": number }`

#### `GET /api/v1/organizations/{organization_id}/templates/{template_id}`

- **Description:** Get a template by id (org-owned or admin_provided).
- **Auth:** Required
- **Response:** `200` — template object (includes content_html, content_json, subject_line)

#### `POST /api/v1/organizations/{organization_id}/templates`

- **Description:** Create a user template. At least content_html or content_json required.
- **Auth:** Required
- **Request:** Body `{ "name", "content_html"?, "content_json"?, "subject_line"? }`
- **Response:** `201` — created template

#### `PATCH /api/v1/organizations/{organization_id}/templates/{template_id}`

- **Description:** Update a user-created template (not admin_provided).
- **Auth:** Required
- **Response:** `200` — updated template

#### `DELETE /api/v1/organizations/{organization_id}/templates/{template_id}`

- **Description:** Delete a user-created template.
- **Auth:** Required
- **Response:** `204`

---

### Campaigns (P2-CAMP-001)

#### `GET /api/v1/organizations/{organization_id}/campaigns`

- **Description:** List campaigns. Optional status filter.
- **Auth:** Required
- **Request:** Query: `status` (draft, scheduled, sending, sent, failed, paused), `limit`, `offset`.
- **Response:** `200` — `{ "campaigns": [ ... ], "total": number }`

#### `GET /api/v1/organizations/{organization_id}/campaigns/{campaign_id}`

- **Description:** Get a campaign by id.
- **Auth:** Required
- **Response:** `200` — campaign object

#### `POST /api/v1/organizations/{organization_id}/campaigns`

- **Description:** Create a draft campaign.
- **Auth:** Required
- **Request:** Body `{ "name", "template_id"?, "subject_line"?, "scheduled_at"? }`
- **Response:** `201` — created campaign

#### `PATCH /api/v1/organizations/{organization_id}/campaigns/{campaign_id}`

- **Description:** Update a campaign (draft/scheduled/paused). Status only settable to draft, scheduled, or paused.
- **Auth:** Required
- **Request:** Body `{ "name"?, "template_id"?, "subject_line"?, "scheduled_at"?, "status"? }`
- **Response:** `200` — updated campaign

#### `GET /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/target-rules`

- **Description:** Get target rules for a campaign (creates default if missing).
- **Auth:** Required
- **Response:** `200` — target rules object (include_tags, exclude_tags, exclude_countries, exclude_unsubscribed, etc.)

#### `PUT /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/target-rules`

- **Description:** Create or update target rules for a campaign.
- **Auth:** Required
- **Request:** Body `{ "include_tags"?, "exclude_tags"?, "exclude_countries"?, "exclude_unsubscribed"?, "exclude_inactive"?, "exclude_bounced"? }`
- **Response:** `200` — saved target rules object

#### `GET /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/recipients`

- **Description:** List recipients for a campaign. Optional status filter (pending, sent, delivered, bounced, opened, clicked).
- **Auth:** Required
- **Request:** Query: `status`, `limit`, `offset`.
- **Response:** `200` — `{ "recipients": [ ... ], "total": number }`

#### `POST /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/prepare` (P2-SES-002)

- **Description:** Resolve recipients from target_rules and insert into campaign_recipients (pending). Does not send.
- **Auth:** Required
- **Response:** `200` — `{ "recipients_count": number }`

#### `POST /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/send` (P2-SES-002)

- **Description:** Prepare recipients if needed, then send campaign emails via SES. Template variables: `{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{country}}`.
- **Auth:** Required
- **Request:** Query: `dry_run` (default false; if true only prepare, no send), `rate_per_sec` (default 1, max 14; messages per second).
- **Response:** `200` — `{ "sent": number, "failed": number, "errors": [ ... ] }` or if dry_run: `{ "dry_run": true, "recipients_count": number }`. **503** if SES not configured.

---

### Internal (cron) — P2-SES-003

These endpoints are for cron/scheduler only. **Not for frontend.** Use header `X-Cron-Secret` (set `CRON_SECRET` in backend `.env`).

#### `POST /api/v1/internal/process-scheduled-campaigns` (P2-SES-003)

- **Description:** Process campaigns with status=scheduled and scheduled_at <= now(); send each via SES (one retry on failure).
- **Auth:** Header `X-Cron-Secret: <CRON_SECRET>`. **503** if CRON_SECRET not set; **401** if header missing or wrong.
- **Request:** Query: `max_campaigns` (default 5, max 20), `rate_per_sec` (default 1).
- **Response:** `200` — `{ "processed": [ { "campaign_id", "organization_id", "status": "sent"|"failed", "result"? } ] }`

Call this URL every 1–5 minutes from a cron job. See Docs/Integrations/ses-setup.md §8.

---

### Track (P2-SES-004) — open/click (public, no auth)

These URLs are embedded in emails; no Bearer token. Token in query is signed with TRACKING_SECRET.

#### `GET /api/v1/track/open?r=<token>` (P2-SES-004)

- **Description:** Record open event; return 1x1 transparent GIF. Called when email client loads the tracking pixel.
- **Auth:** None (token in `r`).
- **Response:** `200` — image/gif (1x1 pixel). Updates `campaign_recipients.opened_at` and inserts `email_events` (event_type=open).

#### `GET /api/v1/track/click?r=<token>&url=<encoded_url>` (P2-SES-004)

- **Description:** Record click event; redirect to original URL.
- **Auth:** None (token in `r`, original URL in `url`).
- **Response:** `302` redirect to decoded `url`. Updates `campaign_recipients.clicked_at` and inserts `email_events` (event_type=click, link_url).

---

### Campaign analytics (P2-AN-001)

#### `GET /api/v1/organizations/{organization_id}/campaigns/{campaign_id}/analytics` (P2-AN-001)

- **Description:** Per-campaign aggregates — sent, opens, clicks, open_rate, click_rate (org-scoped).
- **Auth:** Required
- **Response:** `200` — `{ "campaign_id", "organization_id", "sent_count", "open_count", "click_count", "open_rate", "click_rate" }`

---

### Format for new endpoints

```markdown
#### `METHOD /path` (optional: task ID)

- **Description:** One-line description.
- **Auth:** Required | Not required
- **Request:** Body/query (JSON shape or "none").
- **Response:** JSON shape and status codes (e.g. 200, 400, 401).
- **Notes:** Optional (e.g. pagination, rate limits).
```

---

## Changelog

| Date       | Change                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| 2026-01-31 | Backend setup: FastAPI; `GET /api/v1/health` added.                                           |
| 2026-01-31 | P1-DASH-002: activity GET/POST; P1-RBAC-002: invites GET/POST. JWT auth.                      |
| 2026-01-31 | JWT: support both HS256 and ES256 (Supabase). Backend CI (P1-SETUP-003).                      |
| 2026-01-31 | P2: Contacts, tags, templates, campaigns APIs. P2-ASSET-001 storage doc + migration.          |
| 2026-01-31 | P2-CRM-004: CSV import endpoint `POST .../contacts/import` (multipart, mapping, report).      |
| 2026-01-31 | P2-SES-002: Send campaign batch (prepare + send via SES, rate limit, template vars).          |
| 2026-01-31 | P2-SES-003: Scheduling worker — POST .../internal/process-scheduled-campaigns (cron).         |
| 2026-01-31 | P2-SES-004: Track open/click (pixel + link wrap); email_events; P2-AN-001 campaign analytics. |
