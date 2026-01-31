# API Contract (Backend ↔ Frontend)

**Owner:** Backend. Update this doc whenever you add or change an API that the frontend will call.

The frontend uses this as the **single source of truth** for endpoints, request/response shapes, and auth.

---

## Base URL and Auth

- **Base URL:** TBD (e.g. same origin `/api/*` when using Next.js API routes, or Supabase client for direct DB access where allowed).
- **Auth:** All endpoints that need a user require the Supabase session. Document per endpoint if different (e.g. `Authorization: Bearer <access_token>` or cookie-based).

---

## Endpoints

_No endpoints documented yet. Backend will add entries below as APIs are implemented._

### Format for each endpoint

```markdown
#### `METHOD /path` (optional: task ID)

- **Description:** One-line description.
- **Auth:** Required | Not required
- **Request:** Body/query (JSON shape or "none").
- **Response:** JSON shape and status codes (e.g. 200, 400, 401).
- **Notes:** Optional (e.g. pagination, rate limits).
```

---

## Example (to be replaced by real endpoints)

#### `GET /api/health` (example)

- **Description:** Health check for deployment.
- **Auth:** Not required
- **Request:** None
- **Response:** `200` — `{ "ok": true }`

---

## Changelog

Keep a short log here when you change the contract so Frontend can scan for updates.

| Date       | Change |
| ---------- | ------ |
| (none yet) | —      |
