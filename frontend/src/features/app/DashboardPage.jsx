import React from "react";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user, organizations, signOut } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-sans font-semibold text-[20px] text-brand-dark">
          Dashboard
        </h1>
        <button
          type="button"
          onClick={() => signOut()}
          className="font-sans text-[13px] text-gray-600 hover:text-gray-800"
        >
          Sign out
        </button>
      </div>
      <p className="font-sans text-[14px] text-gray-600 mb-2">
        Signed in as {user?.email}. Organization:{" "}
        {organizations[0]?.name ?? "—"}.
      </p>
      <p className="font-sans text-[13px] text-gray-500">
        Widgets and activity feed will go here (P1-DASH-001).
      </p>
    </div>
  );
}
