-- P1-RBAC-002: Pending invites — admin invites member by email
-- Run after 002_rls_policies.sql.

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_organization_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON public.organization_invites(token) WHERE token IS NOT NULL;

COMMENT ON TABLE public.organization_invites IS 'Pending invites; accept link uses token. Invitation email TBD Phase 2.';

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Members can read invites for their org
CREATE POLICY "Members can read organization_invites"
  ON public.organization_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invites.organization_id AND om.user_id = auth.uid()
    )
  );

-- Only owner/admin can create invites
CREATE POLICY "Admins can insert organization_invites"
  ON public.organization_invites FOR INSERT
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invites.organization_id AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Only owner/admin can delete (revoke) invites
CREATE POLICY "Admins can delete organization_invites"
  ON public.organization_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invites.organization_id AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );
