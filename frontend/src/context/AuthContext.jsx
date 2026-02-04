import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgsResolved, setOrgsResolved] = useState(false);

  const refreshOrganizations = async (token) => {
    if (!token) {
      setOrganizations([]);
      return;
    }
    const res = await api("/onboard/me", { token });
    if (res.ok && Array.isArray(res.data?.organizations)) {
      setOrganizations(res.data.organizations);
    } else {
      setOrganizations([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    setOrgsResolved(false);

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.access_token) {
          return refreshOrganizations(s.access_token);
        }
        setOrganizations([]);
        return null;
      })
      .finally(() => {
        setOrgsResolved(true);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setOrgsResolved(false);
      if (s?.access_token) {
        refreshOrganizations(s.access_token).finally(() =>
          setOrgsResolved(true),
        );
      } else {
        setOrganizations([]);
        setOrgsResolved(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user,
    organizations,
    loading,
    orgsResolved,
    refreshOrganizations: () =>
      session?.access_token && refreshOrganizations(session.access_token),
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
