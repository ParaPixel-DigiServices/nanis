-- ============================================================================
-- CORE MULTI-TENANT AUTH TABLES
-- ============================================================================
-- Based on database-overview.md and architecture requirements
-- Platform: Supabase (PostgreSQL)
-- Design: Multi-tenant organization/workspace model
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Stores application-level user metadata
-- Linked 1:1 with Supabase Auth users (auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ORGANIZATIONS TABLE
-- ============================================================================
-- Represents a business or workspace
-- Primary tenant boundary for multi-tenancy
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ORGANIZATION_MEMBERS TABLE
-- ============================================================================
-- Maps users to organizations (many-to-many relationship)
-- Stores role and permission level per organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- e.g., 'owner', 'admin', 'member', 'viewer'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only have one membership per organization
    UNIQUE(organization_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- Composite index for user-organization lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org ON organization_members(user_id, organization_id);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'Application-level user profiles linked 1:1 with Supabase Auth users';
COMMENT ON TABLE organizations IS 'Business workspaces - primary tenant boundary for multi-tenancy';
COMMENT ON TABLE organization_members IS 'Many-to-many relationship mapping users to organizations with roles';

COMMENT ON COLUMN profiles.id IS 'References auth.users.id - 1:1 relationship with Supabase Auth';
COMMENT ON COLUMN organizations.created_by IS 'User who created the organization (typically becomes owner)';
COMMENT ON COLUMN organization_members.role IS 'User role within the organization (owner, admin, member, viewer, etc.)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Simple and safe policies for multi-tenant organization-based SaaS
-- ============================================================================

-- Helper function to check if user is owner or admin of an organization
CREATE OR REPLACE FUNCTION is_org_owner_or_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = is_org_owner_or_admin.user_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = is_org_member.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can view profiles of members in their organizations
CREATE POLICY "Users can view org member profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = auth.uid()
            AND om2.user_id = profiles.id
        )
    );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
    ON profiles FOR DELETE
    USING (auth.uid() = id);

-- ============================================================================
-- ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (is_org_member(id, auth.uid()));

-- Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only owners and admins can update organizations
CREATE POLICY "Owners and admins can update organizations"
    ON organizations FOR UPDATE
    USING (is_org_owner_or_admin(id, auth.uid()))
    WITH CHECK (is_org_owner_or_admin(id, auth.uid()));

-- Only owners can delete organizations
CREATE POLICY "Owners can delete organizations"
    ON organizations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- ============================================================================
-- ORGANIZATION_MEMBERS RLS POLICIES
-- ============================================================================

-- Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can view memberships for organizations they belong to
CREATE POLICY "Users can view org memberships"
    ON organization_members FOR SELECT
    USING (is_org_member(organization_id, auth.uid()));

-- Only owners and admins can add members
CREATE POLICY "Owners and admins can add members"
    ON organization_members FOR INSERT
    WITH CHECK (is_org_owner_or_admin(organization_id, auth.uid()));

-- Only owners and admins can update member roles
CREATE POLICY "Owners and admins can update member roles"
    ON organization_members FOR UPDATE
    USING (is_org_owner_or_admin(organization_id, auth.uid()))
    WITH CHECK (is_org_owner_or_admin(organization_id, auth.uid()));

-- Owners and admins can remove members, or users can remove themselves
CREATE POLICY "Owners and admins can remove members, users can leave"
    ON organization_members FOR DELETE
    USING (
        is_org_owner_or_admin(organization_id, auth.uid())
        OR user_id = auth.uid()
    );
