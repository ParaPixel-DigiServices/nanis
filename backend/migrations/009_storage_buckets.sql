-- P2-ASSET-001: Storage bucket org-assets + RLS policies (path = {organization_id}/...)
-- Create bucket in Dashboard first (Storage → New bucket → org-assets, Private), then run this.
-- Or uncomment the INSERT below if your Supabase version allows inserting into storage.buckets.

-- Optional: create bucket via SQL (Supabase allows this in many setups)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'org-assets',
--   'org-assets',
--   false,
--   52428800,
--   ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects: allow org members to access only their org's folder (first path segment = organization_id)
-- Requires auth.uid() and organization_members to resolve which orgs the user belongs to.

CREATE POLICY "Org members can select org-assets in their org folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert org-assets in their org folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update org-assets in their org folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete org-assets in their org folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );
