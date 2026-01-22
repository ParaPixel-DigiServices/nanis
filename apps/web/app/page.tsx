"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, BarChart3 } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";

export default function LandingPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [showDemo, setShowDemo] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Don't render landing page if user is authenticated (will redirect)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. BACKGROUND */}
      {/* Using fixed position to ensure it covers everything even on scroll */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/bg-img.png" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay to ensure text readability */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
      </div>

      {/* 2. NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-6xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 rounded-full px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center justify-between"
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Nanis Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Nanis</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
              Log in
            </Link>
            <Link 
              href="/signup" 
              className="bg-[#2F6BFF] hover:bg-[#285ACF] text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </motion.div>
      </nav>

      {/* 3. HERO SECTION */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 px-4 sm:px-6">
        
        <div className="max-w-5xl mx-auto text-center relative">
          
          {/* Hero Content */}
          <div className="relative z-20 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-blue-50/80 border border-blue-100/50 backdrop-blur-sm text-[#2F6BFF] text-[11px] font-bold uppercase tracking-wider mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                v2.0 is now live
              </span>

              {/* Headline */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Manage projects <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2F6BFF] via-purple-600 to-[#2F6BFF] bg-[length:200%_auto] animate-gradient">
                  without the chaos.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
                Nanis brings your team, tasks, and tools together in one glass-smooth interface. 
                Experience the future of work, designed for clarity.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/signup">
                <button className="h-14 px-8 rounded-full bg-[#2F6BFF] hover:bg-[#285ACF] text-white font-bold text-lg shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 flex items-center gap-2 group">
                  Start for free 
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button 
                onClick={() => setShowDemo(true)}
                className="h-14 px-8 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-xl border border-white/60 text-slate-700 font-bold text-lg shadow-sm transition-all hover:-translate-y-1 flex items-center gap-2 group"
              >
                <PlayCircle size={20} className="text-slate-500 group-hover:text-[#2F6BFF] transition-colors" /> 
                Watch Demo
              </button>
            </motion.div>

            {/* Trust/Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="pt-12 flex flex-col items-center gap-4"
            >
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-70">Trusted by modern teams</p>
              <div className="flex items-center gap-[-10px]">
                 {/* Avatar Pile */}
                 {[1,2,3,4].map((i) => (
                   <div key={i} className="w-10 h-10 rounded-full border-[3px] border-white bg-slate-200 shadow-md relative -ml-3 first:ml-0 overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
                   </div>
                 ))}
                 <div className="ml-4 text-sm font-bold text-slate-700">
                    <span className="text-[#2F6BFF]">2,000+</span> teams joined this month
                 </div>
              </div>
            </motion.div>
          </div>

          {/* 4. FLOATING DECORATIONS (Glass Cards) */}
          
          {/* Card 1: Left - Task Completion */}
          <motion.div 
            initial={{ opacity: 0, x: -100, rotate: -10 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ delay: 0.8, duration: 1, type: "spring" }}
            className="absolute -left-16 top-1/4 hidden xl:block pointer-events-none"
          >
            <div className="p-5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] w-72">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
                  <CheckCircle2 size={20} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-800">Project Launch</div>
                  <div className="text-xs font-semibold text-slate-500">Completed just now</div>
                </div>
              </div>
              <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden shadow-inner">
                <div className="h-full w-full bg-green-500 rounded-full" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Right - Analytics */}
          <motion.div 
            initial={{ opacity: 0, x: 100, rotate: 10 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{ delay: 1, duration: 1, type: "spring" }}
            className="absolute -right-16 bottom-1/3 hidden xl:block pointer-events-none"
          >
            <div className="p-5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] w-64">
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-[#2F6BFF]">
                        <BarChart3 size={16} />
                    </div>
                    <div className="text-sm font-extrabold text-slate-800">Growth</div>
                  </div>
                  <div className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">+24%</div>
               </div>
               <div className="flex items-end gap-1.5 h-20">
                  {[40, 65, 50, 90, 60, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-white/40 rounded-t-md relative group overflow-hidden">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1.5 + (i * 0.1), duration: 0.5 }}
                        className="absolute bottom-0 w-full bg-[#2F6BFF] opacity-90 group-hover:opacity-100 transition-opacity rounded-t-md shadow-sm" 
                      />
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Demo Video Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full aspect-video overflow-hidden"
            >
              <button
                onClick={() => setShowDemo(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-lg transition-all"
                aria-label="Close demo"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2F6BFF] to-purple-600">
                <div className="text-center text-white p-8">
                  <PlayCircle size={64} className="mx-auto mb-4 opacity-80" />
                  <h3 className="text-2xl font-bold mb-2">Demo Video</h3>
                  <p className="text-white/80 mb-6">Demo video will be available soon</p>
                  <p className="text-sm text-white/60">In the meantime, try signing up to explore the platform!</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}