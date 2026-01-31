-- P2-CAMP-001: Campaigns + target_rules + recipients + RLS
-- Run after 006_contacts_and_tags.sql. Status: draft → scheduled → sending → sent/failed.

-- -----------------------------------------------------------------------------
-- 1. campaigns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'paused')),
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  subject_line TEXT,
  scheduled_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at
  ON public.campaigns(status, scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. campaign_target_rules (audience selector: segments / rules)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_target_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  include_tags TEXT[],
  exclude_tags TEXT[],
  exclude_countries TEXT[],
  exclude_unsubscribed BOOLEAN DEFAULT true,
  exclude_inactive BOOLEAN DEFAULT true,
  exclude_bounced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

-- -----------------------------------------------------------------------------
-- 3. campaign_recipients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked')),
  sent_at TIMESTAMPTZ NULL,
  bounced_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON public.campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_bounced
  ON public.campaign_recipients(organization_id, status) WHERE status = 'bounced';

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_target_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage campaigns"
  ON public.campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaigns.organization_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaigns.organization_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage campaign_target_rules"
  ON public.campaign_target_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaign_target_rules.organization_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaign_target_rules.organization_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage campaign_recipients"
  ON public.campaign_recipients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaign_recipients.organization_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = campaign_recipients.organization_id AND om.user_id = auth.uid()
    )
  );
