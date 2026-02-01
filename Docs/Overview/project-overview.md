# Project Overview — Nanis

All-in-one Campaign, Communication, and Growth Management SaaS ("Mailchimp on Steroids"). Multi-tenant: organizations/workspaces, email campaigns, visual builder, automations, unified inbox, website builder, analytics, subscription billing.

## Scope (high level)

- **Dashboard** — Activity, campaign summaries, quick access to modules
- **Auth & teams** — Signup, login, OAuth (Google/Apple), org/workspace, invites, RBAC
- **Contacts & CRM** — List, import (CSV), tags, custom fields, segmentation
- **Campaigns** — Create, template, target rules, send via SES, schedule, open/click tracking
- **Templates** — Gallery, user-created, (later) visual builder
- **Assets** — Org-scoped storage (Supabase)
- **Later phases** — Inbox, website builder, automation engine, Razorpay billing

## Tech stack

- **Frontend:** Vite + React (SPA), Tailwind, Framer Motion, React Router. See `Docs/Overview/techstack-locked.md`.
- **Backend:** FastAPI (Python) + Supabase (Postgres, Auth, Storage, Realtime). See `Docs/Overview/architecture-overview.md`.
- **Email:** Amazon SES. **Payments:** Razorpay (Phase 4).

## Phases (12 weeks)

| Phase | Focus            | Outcomes                                            |
| ----- | ---------------- | --------------------------------------------------- |
| **1** | Foundation       | Auth, org/workspace, RLS, dashboard shell           |
| **2** | Core growth      | Contacts, templates, campaigns, SES send, analytics |
| **3** | Builders & inbox | Email builder MVP, unified inbox, website builder   |
| **4** | Automation & pay | Workflow engine, A/B, newsletter, Razorpay          |

Task breakdowns: `Docs/Tasks/Phases/`.
