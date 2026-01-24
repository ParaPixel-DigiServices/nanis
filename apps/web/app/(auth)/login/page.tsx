"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { RiErrorWarningFill } from "react-icons/ri";
import { IoMdClose } from "react-icons/io";
import { BiGlobe } from "react-icons/bi";
import { supabase } from "../../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Incorrect email or password.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to dashboard on successful login
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (oauthError) {
        setError("Failed to sign in with Google. Please try again.");
        setLoading(false);
      }
      // Note: If successful, user will be redirected to Google, then back to /dashboard
      // The AuthContext will automatically handle the session refresh on return
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (oauthError) {
        setError("Failed to sign in with Apple. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* BACKGROUND IMAGE */}
      {/* Assuming bg-img.png is in the public folder */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/bg-img.png" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
        
        {/* OUTER CONTAINER CARD */}
        <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[440px] bg-white/10 backdrop-blur-md border border-white border-radius-40px shadow-[0_8px_40px_rgba(0,0,0,0.12)] rounded-[40px] px-1 pt-1 pb-6 overflow-hidden"
        >
          {/* INNER LOGIN CARD */}
          <div className="w-full bg-white/20 backdrop-blur-xl border border-white border-radius-40px shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-[40px] px-10 py-8 overflow-hidden"
          >
          
          {/* HEADER */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 relative shrink-0">
              <Image
                src="/logo.png"
                alt="Nanis Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Nanis</span>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-900 ml-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-900 ml-1">
                Password<span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="peer w-4 h-4 border-2 border-slate-300 rounded-[4px] bg-white checked:bg-blue-600 checked:border-blue-600 appearance-none transition-all cursor-pointer"
                  />
                  <CheckIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors select-none">Remember me</span>
              </label>
              
              <Link href="#" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                Forgot password?
              </Link>
            </div>

            {/* Error Message (Conditional) */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <RiErrorWarningFill className="text-white text-[10px]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 flex-1">{error}</span>
                  <button 
                    type="button" 
                    onClick={() => setError("")}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <IoMdClose size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-[13px] font-bold py-3 rounded-3xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all duration-200"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-[#f0f2f5] px-2 text-slate-500 rounded-full">Or</span> {/* Note: bg color tries to match glass blur effect visually */}
              </div>
            </div>

            {/* Social Logins */}
            <div className="space-y-2.5">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-white/60 shadow-sm text-slate-700 text-[12px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <FcGoogle size={18} />
                Sign in with Google
              </button>
              <button 
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-white/60 shadow-sm text-slate-700 text-[12px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <FaApple size={18} className="text-black" />
                Sign in with Apple
              </button>
            </div>

          </form>
          </div>

          {/* Sign Up Footer - Moved to Outer Box */}
          <div className="text-center pt-4">
            <p className="text-[11px] text-slate-500 font-medium">
              Don't have an account? <Link href="/signup" className="text-blue-600 font-bold hover:underline">Sign up</Link>
            </p>
          </div>
        </motion.div>

      </div>

      {/* BOTTOM FLOATING BUTTON - Fixed to bottom center */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20"
      >
        <Link href="https://nanis.com" className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-sm hover:bg-white/80 transition-all group">
          <BiGlobe className="text-purple-600" />
          <span className="text-[11px] font-bold text-purple-700 group-hover:text-purple-800">Go back to Nanis.com</span>
        </Link>
      </motion.div>
    </div>
  );
}

// Simple Check Icon for the checkbox
function CheckIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}