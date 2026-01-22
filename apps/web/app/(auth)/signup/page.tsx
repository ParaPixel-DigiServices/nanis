"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { BiGlobe } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { RiErrorWarningFill } from "react-icons/ri";
import { supabase } from "../../../lib/supabase";
import clsx from "clsx";

// --- TYPES ---
type Step = "signup" | "business-name" | "custom-domain" | "welcome";

// --- ANIMATION VARIANTS ---
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80, // Next step comes from right, previous from left
    opacity: 0,
    scale: 0.92,
    filter: "blur(8px)",
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction > 0 ? -80 : 80, // Current step slides left when going forward, right when going back
    opacity: 0,
    scale: 0.92,
    filter: "blur(8px)",
  }),
};

export default function SignupFlow() {
  const [step, setStep] = useState<Step>("signup");
  const [direction, setDirection] = useState(0); // 1 for next, -1 for back
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // --- FORM STATES ---
  // Step 1: Signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Step 2: Business Name
  const [businessName, setBusinessName] = useState("");

  // Step 3: Domain
  const [domain, setDomain] = useState("");
  const [domainError, setDomainError] = useState("");
  const [checkingDomain, setCheckingDomain] = useState(false); // For real-time checking
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null); // null = not checked, true = available, false = taken

  // --- PASSWORD VALIDATION LOGIC ---
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // --- NAVIGATION HANDLERS ---
  const paginate = (newStep: Step, newDirection: number) => {
    setDirection(newDirection);
    setStep(newStep);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!fullName || !email || !password || !agreed) {
      setError("Please fill in all fields and agree to the terms.");
      return;
    }

    if (!hasMinLength || !hasNumber || !hasSpecial) {
      setError("Password must meet all requirements.");
      return;
    }

    setLoading(true);

    try {
      // Create user account - this will trigger the edge function to create profile, org, and membership
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Wait for session to be established
        // Check if email confirmation is required
        if (data.session) {
          // Session is available, proceed
          setLoading(false);
          paginate("business-name", 1);
        } else {
          // No session yet - might need email confirmation or wait a bit
          // Try to get the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session) {
            setLoading(false);
            paginate("business-name", 1);
          } else {
            // Wait a bit for the session to be established (edge function might be creating it)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              setLoading(false);
              paginate("business-name", 1);
            } else {
              setError("Account created but session not established. Please check your email for confirmation or try logging in.");
              setLoading(false);
            }
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!businessName) {
      setError("Please enter your business name.");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("User not authenticated. Please try signing up again.");
        setLoading(false);
        return;
      }

      // Get user's organization (created by edge function)
      let membership = null;
      const maxRetries = 8;
      const retryDelay = 500;
      let retries = 0;
      const startTime = Date.now();
      const maxWaitTime = 8000;
      
      while (!membership && retries < maxRetries) {
        if (Date.now() - startTime > maxWaitTime) {
          setLoading(false);
          setError("Organization is taking longer than expected to create. Please wait a moment and try again.");
          return;
        }

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .maybeSingle();

        if (membershipError && membershipError.code !== "PGRST116") {
          setLoading(false);
          setError(`Failed to find organization: ${membershipError.message}`);
          return;
        }

        if (membershipData) {
          membership = membershipData;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retries++;
      }

      if (!membership) {
        setLoading(false);
        setError("Organization not found. The signup process may still be completing. Please wait a moment and try again.");
        return;
      }

      // Update organization with business name (keep existing slug for now)
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name: businessName,
        })
        .eq("id", membership.organization_id);

      if (updateError) {
        setLoading(false);
        if (updateError.code === "42501" || updateError.message?.includes("policy")) {
          setError("Permission denied. The organization update policy may not be configured.");
        } else {
          setError(`Failed to update organization: ${updateError.message}`);
        }
        return;
      }

      setLoading(false);
      paginate("custom-domain", 1);
    } catch (err: any) {
      console.error("Business name submission error:", err);
      setError(err.message || "Failed to save business name. Please try again.");
      setLoading(false);
    }
  };

  // Real-time domain availability check
  useEffect(() => {
    if (step !== "custom-domain" || !domain || domain.length < 3) {
      setDomainAvailable(null);
      setDomainError("");
      return;
    }

    // Validate domain format first
    const domainRegex = /^[a-z0-9-]+$/;
    if (!domainRegex.test(domain.toLowerCase())) {
      setDomainError("Domain can only contain letters, numbers, and hyphens.");
      setDomainAvailable(false);
      return;
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      setCheckingDomain(true);
      setDomainError("");

      try {
        const { data: existingOrgs, error: checkError } = await supabase
          .from("organizations")
          .select("id, slug")
          .eq("slug", domain.toLowerCase())
          .limit(1);

        if (checkError) {
          console.error("Domain check error:", checkError);
          setDomainAvailable(null);
          return;
        }

        if (existingOrgs && existingOrgs.length > 0) {
          // Check if it's the user's own organization
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: membership } = await supabase
              .from("organization_members")
              .select("organization_id")
              .eq("user_id", user.id)
              .eq("role", "owner")
              .maybeSingle();

            if (membership && existingOrgs[0].id === membership.organization_id) {
              // It's their own org, so it's available for them
              setDomainAvailable(true);
              setDomainError("");
            } else {
              setDomainAvailable(false);
              setDomainError("This domain is already in use");
            }
          } else {
            setDomainAvailable(false);
            setDomainError("This domain is already in use");
          }
        } else {
          setDomainAvailable(true);
          setDomainError("");
        }
      } catch (err) {
        console.error("Domain check error:", err);
        setDomainAvailable(null);
      } finally {
        setCheckingDomain(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [domain, step]);

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDomainError("");
    
    if (!domain) {
      setDomainError("Please enter a domain.");
      return;
    }

    // Validate domain format (alphanumeric and hyphens only)
    const domainRegex = /^[a-z0-9-]+$/;
    if (!domainRegex.test(domain.toLowerCase())) {
      setDomainError("Domain can only contain letters, numbers, and hyphens.");
      return;
    }

    // Check if domain is available
    if (domainAvailable === false) {
      setDomainError("This domain is already in use");
      return;
    }

    setLoading(true);

    try {
      // Get current session first (more reliable than getUser)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Try getUser as fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setLoading(false);
          throw new Error("User not authenticated. Please try signing up again or check if email confirmation is required.");
        }
      }

      // Get user from session or directly
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        throw new Error("User not authenticated. Please try signing up again or check if email confirmation is required.");
      }

      // Get user's organization (created by edge function) - with limited retries and timeout
      let membership = null;
      const maxRetries = 8; // Increased retries
      const retryDelay = 500; // 500ms between retries
      let retries = 0;
      const startTime = Date.now();
      const maxWaitTime = 8000; // 8 second max wait
      
      while (!membership && retries < maxRetries) {
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          setLoading(false);
          throw new Error("Organization is taking longer than expected to create. Please wait a moment and try again, or refresh the page.");
        }

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .maybeSingle();

        if (membershipError) {
          // Only throw if it's not a "not found" error
          if (membershipError.code !== "PGRST116") {
            setLoading(false);
            throw new Error(`Failed to find organization: ${membershipError.message}`);
          }
        }

        if (membershipData) {
          membership = membershipData;
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retries++;
      }

      if (!membership) {
        setLoading(false);
        throw new Error("Organization not found. The signup process may still be completing. Please wait a moment and try again, or refresh the page.");
      }

      // Final check if domain is available (in case it was taken between checks)
      const { data: existingOrgs, error: checkError } = await supabase
        .from("organizations")
        .select("id, slug")
        .eq("slug", domain.toLowerCase())
        .limit(1);

      if (checkError) {
        setLoading(false);
        throw new Error(`Failed to check domain availability: ${checkError.message}`);
      }

      if (existingOrgs && existingOrgs.length > 0) {
        // Check if it's the user's own organization
        if (existingOrgs[0].id !== membership.organization_id) {
          setDomainError("This domain is already in use");
          setLoading(false);
          return;
        }
      }

      // Update organization with business name and domain
      const { data: updatedOrg, error: updateError } = await supabase
        .from("organizations")
        .update({
          name: businessName,
          slug: domain.toLowerCase(),
        })
        .eq("id", membership.organization_id)
        .select();

      if (updateError) {
        setLoading(false);
        // Check if it's an RLS policy violation
        if (updateError.code === "42501" || updateError.message?.includes("policy")) {
          throw new Error("Permission denied. The organization update policy may not be configured. Please contact support.");
        }
        throw new Error(`Failed to update organization: ${updateError.message}`);
      }

      if (!updatedOrg || updatedOrg.length === 0) {
        setLoading(false);
        throw new Error("Organization update returned no data. The update may have been blocked.");
      }

      setLoading(false);
      paginate("welcome", 1);
    } catch (err: any) {
      console.error("Domain submission error:", err);
      const errorMessage = err.message || "Failed to set domain. Please try again.";
      setError(errorMessage);
      setDomainError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (oauthError) {
        setError("Failed to sign up with Google. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleAppleSignup = async () => {
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (oauthError) {
        setError("Failed to sign up with Apple. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleFinalStart = () => {
    router.push("/dashboard");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src="/bg-img.png" alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
        
        {/* HEADER - Capsule Shape Above Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-6 w-full max-w-[360px] px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/10 rounded-full shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 shrink-0">
              <Image src="/logo.png" alt="Nanis" fill className="object-contain" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Nanis</span>
          </div>
          <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[11px] font-bold border border-green-100 flex items-center gap-1 shrink-0">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Trial
          </div>
        </motion.div>

        {/* OUTER GLASS CONTAINER (Fixed Size or Auto) */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {step && (
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
              className="px-1 pt-1 pb-8 bg-white/25 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[40px] w-full max-w-[360px]"
            >
              <div className="bg-white rounded-[40px] px-8 py-6 w-full shadow-sm min-h-[200px] flex flex-col justify-center overflow-hidden relative">
                
                {/* --- STEP 1: SIGNUP --- */}
                {step === "signup" && (
                  <div className="w-full">

                  <form onSubmit={handleSignupSubmit} className="space-y-2.5">
                    <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Full Name</label>
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@work-email.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Password<span className="text-[#2F6BFF]">*</span></label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all pr-10",
                                    !showPassword && password.length > 0 && "text-transparent"
                                )}
                            />
                            {/* Diamond overlay when password is hidden */}
                            {!showPassword && password.length > 0 && (
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-0">
                                    {password.split('').map((_, i) => (
                                        <span key={i} className="text-slate-900 text-[14px] font-medium">✦</span>
                                    ))}
                                </div>
                            )}
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10">
                                {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                            </button>
                        </div>
                    </div>

                     {/* Password Strength Pills */}
                     <div className="flex flex-wrap gap-1.5">
                         <StrengthPill active={hasMinLength} text="8 Characters" />
                         <StrengthPill active={hasNumber} text="Numbers" />
                         <StrengthPill active={hasSpecial} text="Special character" />
                     </div>

                     {/* Error Message */}
                     {error && (
                       <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center gap-2.5">
                         <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                           <RiErrorWarningFill className="text-white text-[10px]" />
                         </div>
                         <span className="text-[12px] font-medium text-red-700 flex-1">{error}</span>
                         <button 
                           type="button" 
                           onClick={() => setError("")}
                           className="text-slate-400 hover:text-slate-600"
                         >
                           <IoClose size={14} />
                         </button>
                       </div>
                     )}

                     <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                            <input 
                                type="checkbox" 
                                checked={agreed}
                                onChange={() => setAgreed(!agreed)}
                                className="peer w-5 h-5 border-2 border-slate-300 rounded-[6px] bg-white checked:bg-[#2F6BFF] checked:border-[#2F6BFF] appearance-none transition-all cursor-pointer"
                            />
                            <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <span className="text-[13px] text-slate-600 font-medium">I agree to Nanis' <a href="#" className="underline hover:text-slate-900">Terms & Privacy</a></span>
                    </div>

                     <button 
                       type="submit" 
                       disabled={loading}
                       className="w-full bg-[#2F6BFF] hover:bg-[#285ACF] disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[14px] font-bold py-2.5 rounded-xl shadow-lg shadow-[#2F6BFF]/30 active:scale-[0.98] transition-all"
                     >
                       {loading ? "Creating account..." : "Sign up"}
                     </button>

                    <div className="relative py-1.5 text-center">
                        <span className="bg-white px-2 text-[12px] text-slate-400 relative z-10">Or</span>
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    </div>

                     <div className="space-y-1.5">
                         <button 
                           type="button" 
                           onClick={handleGoogleSignup}
                           disabled={loading}
                           className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100 shadow-sm text-slate-700 text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                         >
                           <FcGoogle size={20} /> Sign up with Google
                         </button>
                         <button 
                           type="button" 
                           onClick={handleAppleSignup}
                           disabled={loading}
                           className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100 shadow-sm text-slate-700 text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                         >
                           <FaApple size={20} className="text-black" /> Sign up with Apple
                         </button>
                     </div>
                  </form>
                  </div>
                )}

                {/* --- STEP 2: BUSINESS NAME --- */}
                {step === "business-name" && (
                  <div className="w-full">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
                    What's the name of your <br/> business or brand?
                  </h2>

                   <form onSubmit={handleBusinessSubmit} className="space-y-6">
                     {error && (
                       <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
                         <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                           <RiErrorWarningFill className="text-white text-xs" />
                         </div>
                         <span className="text-[12px] font-medium text-red-700 flex-1">{error}</span>
                         <button 
                           type="button" 
                           onClick={() => setError("")}
                           className="text-slate-400 hover:text-slate-600"
                         >
                           <IoClose size={16} />
                         </button>
                       </div>
                     )}
                     <div className="space-y-1.5">
                         <label className="text-[13px] font-semibold text-slate-600">Business name</label>
                         <input 
                             type="text" 
                             autoFocus
                             value={businessName}
                             onChange={(e) => setBusinessName(e.target.value)}
                             placeholder="Enter your business name"
                             className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all shadow-sm"
                         />
                     </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => paginate("signup", -1)}
                            className="px-6 py-3 bg-white border border-slate-200 rounded-full text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                            Back
                        </button>
                        <button 
                            type="submit" 
                            disabled={!businessName}
                            className="px-8 py-3 bg-[#2F6BFF] hover:bg-[#285ACF] disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[14px] font-bold rounded-full shadow-lg shadow-[#2F6BFF]/30 transition-all"
                        >
                            Continue
                        </button>
                    </div>
                  </form>
                  </div>
                )}

                {/* --- STEP 3: CUSTOM DOMAIN --- */}
                {step === "custom-domain" && (
                  <div className="w-full">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
                    Choose a custom domain for <br/> your Nanis account.
                  </h2>

                  <form onSubmit={handleDomainSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-600">Your Nanis domain</label>
                        <div className={clsx(
                            "relative flex items-center w-full px-3 py-3.5 bg-white border rounded-xl text-[14px] font-medium transition-all shadow-sm",
                            domainError ? "border-red-300 focus-within:ring-red-100" : "border-slate-200 focus-within:ring-[#2F6BFF]/20 focus-within:border-[#2F6BFF]"
                        )}>
                            <input 
                                type="text" 
                                autoFocus
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="yourbrand"
                                className={clsx(
                                    "flex-1 bg-transparent focus:outline-none placeholder:text-slate-400 min-w-0",
                                    domainError ? "text-red-500" : "text-slate-800"
                                )}
                            />
                            <span className="text-slate-500 font-medium shrink-0 ml-1">@nanis.com</span>
                            
                            {/* Loading Spinner or Error/Check Icon */}
                            <div className="ml-1.5 w-5 h-5 flex items-center justify-center shrink-0">
                                {checkingDomain ? (
                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-[#2F6BFF] rounded-full animate-spin" />
                                ) : domainError || domainAvailable === false ? (
                                    <IoClose className="text-red-500 text-lg cursor-pointer" onClick={() => setDomain("")} />
                                ) : domainAvailable === true && domain.length > 2 ? (
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : null}
                            </div>
                        </div>
                        {domainError && (
                            <p className="text-[12px] text-red-500 font-medium mt-1">{domainError}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => paginate("business-name", -1)}
                            className="px-6 py-3 bg-white border border-slate-200 rounded-full text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                            Back
                        </button>
                        <button 
                            type="submit" 
                            disabled={!domain || loading}
                            className="px-8 py-3 bg-[#2F6BFF] hover:bg-[#285ACF] disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[14px] font-bold rounded-full shadow-lg shadow-[#2F6BFF]/30 transition-all"
                        >
                            {loading ? "Setting up..." : "Continue"}
                        </button>
                    </div>
                  </form>
                  </div>
                )}

                {/* --- STEP 4: WELCOME (FINAL) --- */}
                {step === "welcome" && (
                  <div className="w-full">
                  {/* Video/Image Placeholder */}
                  <div className="aspect-[4/3] w-full bg-[#E3935B] rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center">
                      {/* Placeholder for the person image in screenshot */}
                      <img src="/welcome-person.png" alt="Welcome" className="w-full h-full object-cover opacity-90" /> {/* Add a dummy image or remove src to see color */}
                      
                      {/* Floating Badge */}
                      <div className="absolute bg-white px-4 py-3 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[14px] font-extrabold text-slate-900 leading-tight">on all projects <br/> is my part of <br/> responsibility.</p>
                      </div>
                  </div>

                  <h2 className="text-[22px] font-bold text-slate-900 mb-6 leading-tight">
                    Welcome to Nanis! We're glad to <br/> have you with us.
                  </h2>

                  <button 
                    onClick={handleFinalStart}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#2F6BFF] hover:bg-[#285ACF] text-white text-[14px] font-bold rounded-full shadow-lg shadow-[#2F6BFF]/30 transition-all"
                  >
                    Get Started
                  </button>
                  </div>
                )}

              </div>

              {/* Already have an account - Moved to Outer Card */}
              <div className="text-center pt-3 pb-2">
                <p className="text-[13px] text-slate-500">
                  Already have an account? <Link href="/login" className="text-[#2F6BFF] font-bold hover:underline">Sign in</Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM FLOATING BUTTON */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute bottom-8"
        >
          <Link 
            href="https://nanis.com" 
            className="flex items-center gap-2 bg-[#F3EBF6]/70 backdrop-blur-xl border border-white/40 px-5 py-2.5 rounded-full shadow-sm hover:bg-white/90 hover:shadow-md transition-all group"
          >
            <BiGlobe className="text-purple-600 text-lg" />
            <span className="text-[11px] font-bold text-purple-700 group-hover:text-purple-800">Go back to Nanis.com</span>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENT: STRENGTH PILL ---
const StrengthPill = ({ active, text }: { active: boolean, text: string }) => (
    <div className={clsx(
        "px-2.5 py-1 rounded-full border text-[10px] font-bold transition-colors duration-300",
        active 
            ? "bg-green-50 border-green-200 text-green-600" 
            : "bg-slate-100 border-slate-200 text-slate-500"
    )}>
        {text}
    </div>
);