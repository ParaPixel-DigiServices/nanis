-- P1-DB-003: RLS policies for multi-tenancy
-- Run after 001_core_tables.sql. Policies enforce: user can only access orgs they belong to.

-- -----------------------------------------------------------------------------
-- 1. Profiles: user can read/update own profile only
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow insert so signup trigger (or backend) can create profile for new user
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. Organizations: user can read orgs they are a member of
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can read organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()
    )
  );

-- Only members can create orgs (creation from app; first member becomes owner via app logic)
CREATE POLICY "Authenticated users can create organization"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only owner/admin can update org (enforced in app or add policy with role check)
CREATE POLICY "Members can update organization"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Organization members: user can read members of orgs they belong to
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can read organization_members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
    )
  );

-- User can add themselves as owner when creating a new org (no members yet)
CREATE POLICY "User can add self as first member"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
    )
  );

-- Admins can add other members (invite)
CREATE POLICY "Admins can insert organization_members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update organization_members"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner can delete organization_members"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );
