import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations", session?.access_token],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await api("/onboard/me", { token: session.access_token });
      if (res.ok && Array.isArray(res.data?.organizations)) {
        return res.data.organizations;
      }
      return [];
    },
    enabled: !!session?.access_token,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const orgsResolved = !orgsLoading;

  useEffect(() => {
    setLoading(true);

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.access_token) {
        queryClient.setQueryData(["organizations", s?.access_token], []);
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const value = {
    session,
    user,
    organizations,
    loading,
    orgsResolved,
    refreshOrganizations: () => {
      if (session?.access_token) {
        queryClient.invalidateQueries({
          queryKey: ["organizations", session.access_token],
        });
      }
    },
    signUp: (email, password, options = {}) =>
      supabase.auth.signUp({ email, password, options }),
    signInWithPassword: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signInWithOAuth: (provider) =>
      supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${
            typeof window !== "undefined" ? window.location.origin : ""
          }/signup`,
        },
      }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
