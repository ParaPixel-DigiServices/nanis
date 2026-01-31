# Migrations

SQL migrations for Supabase (Postgres). Apply in order:

1. **001_core_tables.sql** — P1-DB-002: `profiles`, `organizations`, `organization_members`; enable RLS.
2. **002_rls_policies.sql** — P1-DB-003: RLS policies so users can only access orgs they belong to.
3. **003_handle_new_user.sql** — Trigger: create `public.profiles` row on signup (`auth.users` INSERT).
4. **004_activity_events.sql** — P1-DASH-002: `activity_events` table + RLS.
5. **005_organization_invites.sql** — P1-RBAC-002: `organization_invites` table + RLS.
6. **006_contacts_and_tags.sql** — P2-CRM-001: `contacts`, `contact_tags`, `contact_tag_assignments` + RLS.
7. **007_templates.sql** — P2-TPL-001: `templates` (admin_provided vs user_created) + RLS.
8. **008_campaigns.sql** — P2-CAMP-001: `campaigns`, `campaign_target_rules`, `campaign_recipients` + RLS.
9. **009_storage_buckets.sql** — P2-ASSET-001: RLS policies on `storage.objects` for bucket `org-assets` (path = `{organization_id}/...`). Create bucket `org-assets` in Dashboard first; see `Docs/Platform/storage-buckets.md`.
10. **010_email_events.sql** — P2-SES-004: `email_events` table (open/click) for analytics; RLS for org read.

Apply via:

- **Supabase Dashboard** — SQL Editor: paste and run each file in order.
- **Supabase CLI** — `supabase link` then run migrations (or paste into SQL Editor).

Naming: `NNN_description.sql` (e.g. `003_contacts.sql` for Phase 2).
