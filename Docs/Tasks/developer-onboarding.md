# Developer Onboarding (Read This First)

Welcome to the Nanis platform build.

## 1) What you’re building (one paragraph)

Nanis is an all-in-one Campaign, Communication, and Growth Management SaaS platform ("Mailchimp on Steroids"). It combines email campaigns, a visual builder, automations, a unified inbox, website builder, analytics, and subscription billing in one multi-tenant system.

## 2) Required reading (before coding)

1. Docs/project-overview.md
2. Docs/architecture-overview.md
3. Docs/database-overview.md
4. Docs/techstack-locked.md
5. Docs/roadmap-delivery.md
6. Docs/Tasks/phase-1-foundation.md (then the other phases)

## 3) Non-negotiables

- **Tech stack is locked:** Next.js + TypeScript + Tailwind + Framer Motion; Supabase (Postgres/Auth/Storage/Realtime/Edge Functions); SES; Razorpay.
- **Multi-tenancy + security:** all org-owned data must be protected by RLS.
- **Secrets:** never ship secrets to the browser; third-party keys are server-only.

## 4) How work is organized

- Work is phased (Weeks 1–12). Each phase file contains tasks.
- For large tasks, use Docs/Tasks/atomic-breakdowns.md to pick smaller units.
- Use task IDs in branch names and PR titles.

## 5) Definition of Done (DoD) for a task

A task is "Done" only when:

- It meets all Acceptance Criteria.
- Error states are handled (not only the happy path).
- It respects tenant boundaries (RLS + server checks).
- It has at least a basic manual test path documented (steps to verify).

## 6) PR workflow (suggested)

- Branch naming: `feat/<TASK-ID>-short-title` or `fix/<TASK-ID>-short-title`
- PR title: `<TASK-ID> — <short title>`
- PR must include:
  - Summary of changes
  - How to test
  - Screenshots for UI work (if applicable)
  - Notes about migrations/RLS changes (if any)

## 7) Access checklist (request on day 1)

- Supabase project access (and separate staging vs prod if available)
- AWS SES access + DNS control for domain verification
- Razorpay test credentials + webhook secret
- WhatsApp Business API access (Meta Business verification may be required)
- Telegram bot token
- (Optional) Twitter/X developer access

## 8) Communication

- Raise blockers immediately, especially external approvals.
- Prefer small PRs (0.5–2 day tasks) for fast review and integration.
