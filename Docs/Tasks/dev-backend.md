# Developer B — Backend Focus (Supabase/Postgres/RLS/Edge Functions)

This is a suggested assignment list for a backend-leaning developer.

## Weeks 1–3 (Phase 1)

- P1-DB-001: Supabase project + local dev workflow
- P1-DB-002: Core tables (orgs/members/profiles)
- P1-DB-003: RLS policies (multi-tenant)
- P1-DB-004: Seed script
- P1-RBAC-001: Roles + permissions model
- P1-DASH-002: Activity feed (backend stub)

## Weeks 4–6 (Phase 2)

- P2-CRM-001: Contacts schema + RLS
- P2-CRM-004: CSV import pipeline (MVP)
- P2-CRM-005: Custom fields framework
- P2-ASSET-001: Storage buckets + policies
- P2-TPL-001: Template schema + types
- P2-CAMP-001: Campaign schema + statuses
- P2-SES-002: Send campaign batch (Edge Function)
- P2-SES-003: Scheduling worker
- P2-SES-004: Tracking (opens/clicks)
- P2-AN-001: Analytics tables + aggregates

## Weeks 7–9 (Phase 3)

- P3-BUILDER-001: Email block schema + renderer
- P3-INBOX-001: Inbox schema + RLS
- P3-INBOX-002: Realtime subscriptions
- P3-WEB-001: Website schema + RLS

## Weeks 10–12 (Phase 4)

- P4-AUTO-001: Event log foundation
- P4-AUTO-002: Workflow schema
- P4-AUTO-004: Execution worker
- P4-AUTO-005: Delay/scheduling
- P4-BILL-001: Billing schema
- P4-AN-002: Index/query tuning

## Notes

- Keep third-party secrets server-side only.
- Treat RLS as non-negotiable for all org-owned tables.
