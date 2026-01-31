# Storage Buckets (P2-ASSET-001)

**Owner:** Backend. Access controlled by org membership.

## Bucket: `org-assets`

- **Purpose:** Per-organization file assets (images, documents). Path format: `{organization_id}/...`
- **Creation:** Create in Supabase Dashboard: **Storage → New bucket** → name `org-assets`, **Private** (or Public if you need public URLs). If you use SQL, run the bucket insert from `backend/migrations/009_storage_buckets.sql` (or create via Dashboard before applying RLS migration).
- **Access:** RLS on `storage.objects` restricts SELECT/INSERT/UPDATE/DELETE to rows where the first path segment equals an `organization_id` the current user belongs to (see migration).

## Frontend usage

- Upload: `storage.from('org-assets').upload('{organization_id}/filename', file, { upsert: true })`
- List: `storage.from('org-assets').list('{organization_id}')`
- Download/signed URL: use Supabase client with user's JWT so RLS applies.

Backend can generate signed URLs via service role for org-scoped paths when needed.
