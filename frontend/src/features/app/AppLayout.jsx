import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, organizations, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  // Keep auth/org gating for integration, but avoid adding any extra UI chrome.
  // The original design/background is owned by App.jsx + DashboardLayout.
  return <Outlet />;
}
