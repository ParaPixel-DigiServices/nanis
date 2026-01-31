-- P2-TPL-001: Templates (admin_provided vs user_created) + RLS
-- Run after 002_rls_policies.sql. Content as HTML + metadata or JSON (renderable).

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  admin_provided BOOLEAN NOT NULL DEFAULT false,
  content_html TEXT,
  content_json JSONB,
  subject_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT templates_content_check CHECK (content_html IS NOT NULL OR content_json IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON public.templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_provided ON public.templates(admin_provided) WHERE admin_provided = true;

COMMENT ON TABLE public.templates IS 'Email templates: admin_provided (org_id NULL) or user_created (org_id set).';

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Admin-provided: org_id NULL, readable by all org members (no row owner)
-- User-created: org_id set, only that org's members can CRUD
CREATE POLICY "Members can read org templates"
  ON public.templates FOR SELECT
  USING (
    (organization_id IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = templates.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can insert user templates"
  ON public.templates FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = templates.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can update user templates"
  ON public.templates FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = templates.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can delete user templates"
  ON public.templates FOR DELETE
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = templates.organization_id AND om.user_id = auth.uid()
    )
  );
