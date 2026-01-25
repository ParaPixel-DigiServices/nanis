# Database SQL

This folder contains executable SQL scripts and reference schemas for Supabase/Postgres.

## Files

- `database/schema-auth-tables.sql` — Core multi-tenant auth tables (`profiles`, `organizations`, `organization_members`) + helper functions/policies.
- `database/schema-contacts.sql` — Contacts schema draft/implementation.
- `database/schema-minimal-multi-tenant.sql` — Minimal baseline schema (earlier iteration).
- `database/rls-day1-minimal.sql` — Day-1 minimal RLS policies.
- `database/remove-rls-policies.sql` — Utility script to remove/reset RLS policies.
- `database/supabase-schema-complete.sql` — Consolidated schema snapshot.

## Notes

- Prefer applying schema changes via migrations in a real Supabase local workflow; these files are currently treated as reference/one-off scripts.
