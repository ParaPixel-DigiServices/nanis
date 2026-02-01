# Team Collaboration — Frontend & Backend

This doc is the **single source of truth** for how the two developers work together and stay in sync.

---

## 1. Team Setup

| Role         | Focus                                        | Primary folder |
| ------------ | -------------------------------------------- | -------------- |
| **Backend**  | Supabase, Postgres, RLS, Edge Functions, API | `backend/`     |
| **Frontend** | Vite, React, Tailwind, UI, routing           | `frontend/`    |

- **Backend** owns: database schema, migrations, RLS, server-side logic, Edge Functions, and **documenting all APIs** in `Docs/API/`.
- **Frontend** owns: app shell, pages, components, auth UI, and calling backend/APIs per the API contract.

There is no separate "integrations" developer; integration tasks (SES, Razorpay, WhatsApp, etc.) are owned by **Backend** unless a task explicitly needs frontend work (e.g. OAuth buttons).

---

## 2. Communication Rules

### 2.1 When Backend adds or changes an API

1. **Update** `Docs/API/README.md` (or the relevant API doc) with:
   - Method, path, and short description
   - Request body/query shape and types
   - Response shape and status codes
   - Any auth requirement (e.g. `Authorization: Bearer <token>`)
2. **Mention in PR** that the API contract was updated and which endpoints changed.
3. If request/response shapes affect frontend types, either:
   - Export shared types from a common place (e.g. `backend/types` or a shared package), or
   - Keep types in sync by documenting them in `Docs/API/` so Frontend can copy or generate.

### 2.2 When Frontend needs something from Backend

1. **Check** `Docs/API/README.md` first.
2. If an endpoint is missing or the contract is unclear:
   - Open an issue or write in your preferred channel (Slack/Discord/email) with: **task ID**, **what you need** (e.g. "GET /api/contacts with pagination"), and **expected shape** if you have a preference.
3. Backend adds the endpoint (or adjusts the contract) and updates the API doc; then Frontend can implement the UI.

### 2.3 Blockers and dependencies

- **Raise blockers early** (e.g. "P2-CAMP-002 is blocked until P2-CAMP-001 and API for listing campaigns are done").
- Prefer **short written updates** (e.g. in PR descriptions or a shared doc) so the other person can catch up asynchronously.
- If a task spans both frontend and backend, **split by acceptance criteria** and call out dependencies in the phase task file.

---

## 3. Repo and Branches

- **Single repo**; code lives in `frontend/` and `backend/`.
- **Branch naming:** `feat/<TASK-ID>-short-title` or `fix/<TASK-ID>-short-title` (e.g. `feat/P1-DB-001-supabase-setup`).
- **PR title:** `<TASK-ID> — <short title>`.
- **PR scope:** Prefer one task (or one logical piece) per PR so the other dev can review and merge without blocking.

---

## 4. What to Document Where

| What                         | Where                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| API endpoints & payloads     | `Docs/API/README.md` (Backend maintains)                                                                             |
| Database schema / migrations | Backend repo (e.g. `backend/migrations/` or Supabase migrations); summary in phase task or a future `Docs/Database/` |
| Auth flow, session, RLS      | `Docs/Overview/architecture-overview.md`; auth-specific details in a future `Docs/Auth/` when added                  |
| Who does what (tasks)        | `Docs/Tasks/Dev/dev-backend.md`, `Docs/Tasks/Dev/dev-frontend.md`                                                    |
| How we work together         | This file: `Docs/Team/collaboration.md`                                                                              |
| Decisions                    | `Docs/Overview/decision-log.md`                                                                                      |

---

## 5. Suggested Cadence

- **Start of week:** Quick alignment (what each is doing this week, any blockers).
- **When merging:** Backend merges first for API/schema changes; Frontend merges after and updates UI to use new APIs.
- **End of week:** Short recap (what landed, what’s blocked, what’s next).

---

## 6. Entry Points by Role

**I’m the Backend developer:**

1. Read `Docs/Overview/architecture-overview.md` and `Docs/Overview/techstack-locked.md`.
2. Pick tasks from `Docs/Tasks/Dev/dev-backend.md` and the phase files (e.g. `Docs/Tasks/Phases/phase-1-foundation.md`).
3. Keep `Docs/API/README.md` up to date as you add endpoints.
4. Use this doc for handoff and communication with Frontend.

**I’m the Frontend developer:**

1. Read `Docs/Overview/architecture-overview.md` and `Docs/Platform/routing.md`.
2. Pick tasks from `Docs/Tasks/Dev/dev-frontend.md` and the phase files.
3. Consume APIs from `Docs/API/README.md`; ask Backend for changes or new endpoints when needed.
4. Use this doc for handoff and communication with Backend.
