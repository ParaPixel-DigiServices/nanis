-- P1-DASH-002: Activity feed — simple events table for dashboard
-- Run after 002_rls_policies.sql.

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_org_created
  ON public.activity_events(organization_id, created_at DESC);

COMMENT ON TABLE public.activity_events IS 'Recent activity for dashboard feed; scoped by org.';

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Members can read activity for their org
CREATE POLICY "Members can read activity_events"
  ON public.activity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()
    )
  );

-- Members can insert (app will insert on behalf of current user)
CREATE POLICY "Members can insert activity_events"
  ON public.activity_events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()
    )
  );
