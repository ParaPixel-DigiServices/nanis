import React from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
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

  if (!organizations?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark p-4">
        <div className="max-w-md text-center">
          <p className="font-sans text-[14px] text-gray-700 mb-2">
            Create a workspace to continue.
          </p>
          <Link
            to="/onboarding"
            className="font-sans text-[14px] font-medium text-[#335CFF] hover:underline"
          >
            Create workspace
          </Link>
        </div>
      </div>
    );
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
