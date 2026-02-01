# Nanis — Campaign & Growth Management SaaS

All-in-one Campaign, Communication, and Growth Management platform ("Mailchimp on Steroids"). Multi-tenant SaaS: email campaigns, visual builder, automations, unified inbox, website builder, analytics, subscription billing.

## Repo structure

- **frontend/** — Vite + React + Tailwind (UI, routing, auth). See [Docs/Tasks/Dev/frontend-state.md](Docs/Tasks/Dev/frontend-state.md)
- **backend/** — FastAPI (Python) + Supabase (Postgres, Auth, Storage, Realtime)
- **Docs/** — Project docs, API contract, tasks, client checklist

## Getting started

1. **Docs:** [Docs/README.md](Docs/README.md) for entry points
2. **Backend:** [backend/README.md](backend/README.md) — setup, run, migrations. Then [Docs/API/README.md](Docs/API/README.md)
3. **Frontend:** [Docs/Team/collaboration.md](Docs/Team/collaboration.md) + [Docs/Tasks/Dev/dev-frontend.md](Docs/Tasks/Dev/dev-frontend.md). Env and Auth: [Docs/Tasks/Onboarding/setup-checklist.md](Docs/Tasks/Onboarding/setup-checklist.md)
4. **Tasks:** [Docs/tasks-index.md](Docs/tasks-index.md) — phases and task breakdowns

## Tech stack

- **Frontend:** Vite + React, Tailwind, Framer Motion, React Router
- **Backend:** FastAPI + Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Email:** Amazon SES | **Payments:** Razorpay

[Docs/Overview/techstack-locked.md](Docs/Overview/techstack-locked.md) | [Docs/Overview/architecture-overview.md](Docs/Overview/architecture-overview.md)

**Client checklist (Phase 2):** [Docs/Client/client-checklist-through-phase-2.md](Docs/Client/client-checklist-through-phase-2.md) — Supabase, Google/Apple OAuth, AWS SES, DNS, what to share with the developer.
