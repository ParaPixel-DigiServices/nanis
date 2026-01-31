-- P2-CRM-001: Contacts + tags (contact_tags, contact_tag_assignments) + RLS
-- Run after 002_rls_policies.sql. Contacts scoped to org; RLS prevents cross-org access.

-- -----------------------------------------------------------------------------
-- 1. contacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  mobile TEXT,
  country TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_subscribed BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT contacts_email_or_mobile_check CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_org_active ON public.contacts(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contacts_country ON public.contacts(organization_id, country) WHERE country IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_org_email_unique
  ON public.contacts(organization_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE public.contacts IS 'CRM contacts; scoped by organization_id.';

-- -----------------------------------------------------------------------------
-- 2. contact_tags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_organization_id ON public.contact_tags(organization_id);

-- -----------------------------------------------------------------------------
-- 3. contact_tag_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_contact ON public.contact_tag_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_tag ON public.contact_tag_assignments(tag_id);

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tag_assignments ENABLE ROW LEVEL SECURITY;

-- contacts: org members can CRUD
CREATE POLICY "Members can read contacts"
  ON public.contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contacts.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can insert contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contacts.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can update contacts"
  ON public.contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contacts.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can delete contacts"
  ON public.contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contacts.organization_id AND om.user_id = auth.uid()
    )
  );

-- contact_tags: org members can CRUD
CREATE POLICY "Members can read contact_tags"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tags.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can manage contact_tags"
  ON public.contact_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tags.organization_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tags.organization_id AND om.user_id = auth.uid()
    )
  );

-- contact_tag_assignments: org members can CRUD
CREATE POLICY "Members can read contact_tag_assignments"
  ON public.contact_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tag_assignments.organization_id AND om.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can manage contact_tag_assignments"
  ON public.contact_tag_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tag_assignments.organization_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = contact_tag_assignments.organization_id AND om.user_id = auth.uid()
    )
  );
