-- ============================================================================
-- DAY-1 MINIMAL ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Simple, explicit RLS policies for initial development
-- No role-based logic, no deletes, no helper functions
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can read organizations they are members of
CREATE POLICY "organizations_select_member"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
        )
    );

-- Users can update organizations they are members of
CREATE POLICY "organizations_update_member"
    ON organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- ORGANIZATION_MEMBERS TABLE
-- ============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own organization_members rows
CREATE POLICY "organization_members_select_own"
    ON organization_members FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own organization_members row during signup
CREATE POLICY "organization_members_insert_own"
    ON organization_members FOR INSERT
    WITH CHECK (user_id = auth.uid());
