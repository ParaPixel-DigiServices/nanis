import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, organizations, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <p className="font-sans text-[14px] text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // First-time signup (e.g. OAuth): no org yet → send to /signup to complete questionnaire (business name, domain).
  if (!organizations?.length) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      <header className="h-12 border-b border-surface-border bg-white flex items-center px-4">
        <span className="font-sans font-medium text-[14px] text-brand-dark">
          {organizations[0]?.name ?? "Workspace"}
        </span>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
