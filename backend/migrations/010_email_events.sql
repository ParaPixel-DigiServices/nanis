-- P2-SES-004: Email events (open/click) for analytics. RLS for org-scoped read.
-- Run after 008_campaigns.sql.

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  link_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(campaign_recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_events_org_created ON public.email_events(organization_id, created_at);

COMMENT ON TABLE public.email_events IS 'P2-SES-004: Open/click events for campaign analytics.';

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Org members can read; service role inserts (no policy for anon — track endpoints use service)
CREATE POLICY "Org members can read email_events"
  ON public.email_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = email_events.organization_id AND om.user_id = auth.uid()
    )
  );

-- Allow inserts without auth for track endpoints (backend uses service role)
-- Service role bypasses RLS; if track endpoints use anon, we need INSERT policy for specific case.
-- We'll use service role in the backend for track inserts, so no anon INSERT policy.
