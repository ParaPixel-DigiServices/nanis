# Nanis

<p align="center">
	<img src="apps/web/public/logo.png" alt="Nanis" width="96" />
</p>

<p align="center">
	<strong>All‑in‑one Campaign, Communication & Growth Management SaaS</strong><br/>
	A multi-tenant platform (Supabase + Next.js) for campaigns, contacts, inbox, automations, and analytics.
</p>

<p align="center">
	<a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
	<img alt="Status" src="https://img.shields.io/badge/status-pre--alpha-orange"/>
	<img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black"/>
	<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue"/>
	<img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ECF8E"/>
	<img alt="Tailwind" src="https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC"/>
</p>

## What this project is

Nanis is being built as a unified “growth OS” for businesses: manage audiences/contacts, run email campaigns, communicate via a unified inbox, automate workflows, publish content, and view analytics — all from one product.

The delivery plan is structured as a 12‑week phased roadmap:

- Phase 1: Foundation (auth, orgs, RLS, base UI)
- Phase 2: Core growth (contacts, campaigns, assets, SES)
- Phase 3: Builders & comms (editor, inbox, realtime)
- Phase 4: Automation & monetization (workflows, billing, advanced analytics)

See: [Docs/Overview/project-overview.md](Docs/Overview/project-overview.md) and [Docs/Overview/roadmap-delivery.md](Docs/Overview/roadmap-delivery.md)

## Current status (what’s done vs remaining)

Implemented (so far):

- Next.js + TypeScript web app scaffold (Tailwind + ESLint configured)
- Auth UI for signup/login (Supabase Auth)
- Client-side session handling + protected app area (redirects unauth → login, auth → dashboard)
- Multi-tenant core schema + RLS reference scripts
- Edge Function to create profile + org + membership on signup (service role on server side)

Still pending / in progress (high level):

- `.env.example` + secrets strategy documentation
- CI workflow (lint/typecheck/build)
- Password reset screen + logout
- Workspace onboarding UX (“create/join workspace”) + team management UI
- Contacts module completion, campaign sending, inbox, automation, billing

Authoritative task tracking lives in: [Docs/Tasks/Phases/phase-1-foundation.md](Docs/Tasks/Phases/phase-1-foundation.md)

## Repo layout

- [apps/web/](apps/web/) — Next.js app (frontend)
- [apps/api/](apps/api/) — server/Edge-function code and backend modules
- [Docs/](Docs/) — product, architecture, and task documentation (start at [Docs/README.md](Docs/README.md))
- [database/](database/) — SQL scripts and schema references (see [database/README.md](database/README.md))

## Quickstart (web)

Prereqs:

- Node.js 20+
- A Supabase project (URL + anon key)

From [apps/web/](apps/web/):

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

The web app expects the following variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are read by the Supabase client in the web app; the app will throw on startup if they’re missing.

Server-only variables (never expose to the browser):

- `SUPABASE_SERVICE_ROLE_KEY` (used by the signup Edge Function)

For the intended signup side-effects flow, see: [Docs/Auth/signup-flow.md](Docs/Auth/signup-flow.md)

## Database & RLS

Reference SQL scripts live in: [database/](database/)

Key files:

- `database/schema-auth-tables.sql` — core multi-tenant auth tables + helper functions/policies
- `database/rls-day1-minimal.sql` — minimal RLS policies

RLS documentation: [Docs/Database/rls.md](Docs/Database/rls.md)

## Documentation

- Docs hub: [Docs/README.md](Docs/README.md)
- Architecture: [Docs/Overview/architecture-overview.md](Docs/Overview/architecture-overview.md)
- Tech stack: [Docs/Overview/techstack-locked.md](Docs/Overview/techstack-locked.md)
- Tasks index: [Docs/tasks-index.md](Docs/tasks-index.md)

## License

MIT — see [LICENSE](LICENSE)
