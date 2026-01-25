-- ============================================================================
-- REMOVE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- This script completely removes all RLS policies and helper functions
-- that were added for the multi-tenant auth tables
-- ============================================================================
-- WARNING: This will disable all RLS protection on these tables.
-- Only run this if you want to remove RLS entirely.
-- ============================================================================

-- ============================================================================
-- DROP PROFILES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view org member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Disable RLS on profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ORGANIZATIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- Disable RLS on organizations
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ORGANIZATION_MEMBERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org memberships" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can remove members, users can leave" ON organization_members;

-- Disable RLS on organization_members
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS is_org_owner_or_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_org_member(UUID, UUID);

-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to verify removal)
-- ============================================================================

-- Check if RLS is disabled on tables
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('profiles', 'organizations', 'organization_members');

-- Check remaining policies (should return 0 rows)
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('profiles', 'organizations', 'organization_members');

-- Check remaining functions (should return 0 rows)
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('is_org_owner_or_admin', 'is_org_member');

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this script:
-- 1. All RLS policies have been removed
-- 2. RLS is disabled on all three tables
-- 3. Helper functions have been dropped
-- 4. Tables are now accessible without RLS restrictions
-- 
-- IMPORTANT: Without RLS, you must implement access control at the
-- application level to prevent unauthorized data access.
-- ============================================================================
