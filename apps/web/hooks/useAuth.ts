import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Types
interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  organizationMember: OrganizationMember | null;
  loading: boolean;
  session: Session | null;
}


/**
 * React hook for authentication and user data
 * 
 * Returns:
 * - user: Current authenticated user from Supabase Auth
 * - profile: User's profile from profiles table
 * - organization: User's organization (first organization they belong to)
 * - organizationMember: Organization membership details
 * - loading: Loading state
 * - session: Current session
 * 
 * Works with Day-1 RLS policies:
 * - Users can read their own profile
 * - Users can read organizations they are members of
 * - Users can read their own organization_members rows
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationMember, setOrganizationMember] =
    useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // Fetch user profile and organization
    const fetchUserData = async (
      currentUser: User,
      isMounted: boolean
    ) => {
      if (!isMounted) {
        return;
      }

      try {
        // Fetch profile (users can read their own profile per RLS)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        // Check if component is still mounted before updating state
        if (!isMounted) {
          return;
        }

        if (profileError && profileError.code !== "PGRST116") {
          // PGRST116 is "not found" - profile might not exist yet
          console.error("Error fetching profile:", profileError);
        }

        setProfile(profileData || null);

        // Fetch organization membership (users can read their own memberships per RLS)
        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select(
            `
            *,
            organizations (*)
          `
          )
          .eq("user_id", currentUser.id)
          .limit(1)
          .maybeSingle();

        // Check if component is still mounted before updating state
        if (!isMounted) {
          return;
        }

        if (membershipError && membershipError.code !== "PGRST116") {
          console.error("Error fetching organization membership:", membershipError);
        }

        if (membershipData) {
          setOrganizationMember(membershipData as OrganizationMember);
          // Extract organization from the joined data
          const org = (membershipData as any).organizations as Organization;
          setOrganization(org || null);
        } else {
          setOrganizationMember(null);
          setOrganization(null);
        }
      } catch (error) {
        // Ignore AbortError - it's expected when component unmounts or request is aborted
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in fetchUserData:", error);
        }
        // Ensure we still set loading to false even on error
        if (isMounted) {
          setProfile(null);
          setOrganization(null);
          setOrganizationMember(null);
        }
      } finally {
        // Always set loading to false if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // If user exists, fetch profile and organization
        if (initialSession?.user) {
          await fetchUserData(initialSession.user, mounted);
        } else {
          setLoading(false);
        }
      } catch (error) {
        // Ignore AbortError
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in getInitialSession:", error);
        }
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener for session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setLoading(true);
        await fetchUserData(newSession.user, mounted);
      } else {
        // User signed out
        setProfile(null);
        setOrganization(null);
        setOrganizationMember(null);
        setLoading(false);
      }
    });

    // Get initial session
    getInitialSession();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    organization,
    organizationMember,
    loading,
    session,
  };
}
