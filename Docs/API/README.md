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

| Date       | Change                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| 2026-01-31 | Backend setup: FastAPI; `GET /api/v1/health` added.                      |
| 2026-01-31 | P1-DASH-002: activity GET/POST; P1-RBAC-002: invites GET/POST. JWT auth. |
| 2026-01-31 | JWT: support both HS256 and ES256 (Supabase). Backend CI (P1-SETUP-003). |
