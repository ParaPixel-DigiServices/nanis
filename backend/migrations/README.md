# Migrations

SQL migrations for Supabase (Postgres). Apply in order:

1. **001_core_tables.sql** — P1-DB-002: `profiles`, `organizations`, `organization_members`; enable RLS.
2. **002_rls_policies.sql** — P1-DB-003: RLS policies so users can only access orgs they belong to.
3. **003_handle_new_user.sql** — Trigger: create `public.profiles` row on signup (`auth.users` INSERT).
4. **004_activity_events.sql** — P1-DASH-002: `activity_events` table + RLS.
5. **005_organization_invites.sql** — P1-RBAC-002: `organization_invites` table + RLS.

Apply via:

- **Supabase Dashboard** — SQL Editor: paste and run each file in order.
- **Supabase CLI** — `supabase link` then run migrations (or paste into SQL Editor).

Naming: `NNN_description.sql` (e.g. `003_contacts.sql` for Phase 2).
