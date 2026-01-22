"use client";

import { useAuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!organization) {
    return (
      <div>
        <div>Setting up your workspace...</div>
      </div>
    );
  }

  return children;
}
