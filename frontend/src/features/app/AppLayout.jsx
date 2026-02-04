import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, organizations, loading, orgsResolved } = useAuth();

  if (loading || !orgsResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-sans text-[14px] text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!organizations?.length) {
    return <Navigate to="/signup" replace />;
  }

  return <Outlet />;
}
