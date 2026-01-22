"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { User, Session } from "@supabase/supabase-js";

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

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  organizationMember: OrganizationMember | null;
  loading: boolean;
  session: Session | null;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authData = useAuth();

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuthContext must be used within an AuthProvider. Make sure to wrap your component tree with <AuthProvider>."
    );
  }

  return context;
}
