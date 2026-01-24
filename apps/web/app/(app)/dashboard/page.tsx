"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAuthContext } from "../../../context/AuthContext";

export default function DashboardPage() {
  const { profile, organization, loading } = useAuthContext();

  // Show loading state while auth is resolving
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500 text-sm font-medium">Loading...</div>
      </div>
    );
  }

  // Get user's first name or fallback
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const organizationName = organization?.name || "your workspace";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 md:p-12"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 relative shrink-0">
              <Image
                src="/logo.png"
                alt="Nanis Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              Nanis
            </span>
          </div>

          {/* Welcome Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Welcome back, {firstName}! 👋
              </h1>
              <p className="text-slate-600 text-base font-medium">
                You're signed in to <span className="font-bold text-slate-900">{organizationName}</span>
              </p>
            </div>

            {/* Placeholder for future analytics */}
            <div className="pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-500 font-medium">
                Your dashboard analytics will appear here soon.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
