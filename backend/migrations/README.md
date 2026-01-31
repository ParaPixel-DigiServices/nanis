# Migrations

SQL migrations for Supabase (Postgres). Apply via:

1. **Supabase Dashboard** — SQL Editor: paste and run each migration in order.
2. **Supabase CLI** — `supabase link` then `supabase db push` (if using local Supabase).

Naming: `YYYYMMDD_description.sql` (e.g. `20260131_core_tables.sql`).

Core tables (P1-DB-002) will be added in migration `001_core_tables.sql` (profiles, organizations, organization_members).
