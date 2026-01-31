# API Contract (Backend ↔ Frontend)

**Owner:** Backend. Update this doc whenever you add or change an API that the frontend will call.

The frontend uses this as the **single source of truth** for endpoints, request/response shapes, and auth.

---

## Base URL and Auth

- **Base URL:** Backend runs as FastAPI (e.g. `http://localhost:8000` locally). Frontend calls `http://localhost:8000/api/v1/...` in dev; production TBD (e.g. same host or separate API host).
- **Auth:** Endpoints that need a user require `Authorization: Bearer <supabase_access_token>`. Backend validates the Supabase JWT. Document per endpoint if different.

---

## Endpoints

### Health

#### `GET /api/v1/health`

- **Description:** Health check for deployment and load balancers.
- **Auth:** Not required
- **Request:** None
- **Response:** `200` — `{ "status": "ok" }`

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

| Date       | Change                                              |
| ---------- | --------------------------------------------------- |
| 2026-01-31 | Backend setup: FastAPI; `GET /api/v1/health` added. |
