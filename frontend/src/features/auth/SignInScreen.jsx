import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.svg";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    setSubmitting(true);
    const { data, error: err } = await signInWithPassword(
      email.trim(),
      password
    );
    setSubmitting(false);
    if (err) {
      setError(err.message || "Sign in failed.");
      return;
    }
    if (data?.session) {
      navigate("/campaigns/email", { replace: true });
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center overflow-hidden relative">
      <div className="flex flex-col items-center transform origin-center scale-100 mbp:scale-125">
        <div className="flex flex-col items-center gap-[20px]">
          <div
            className="p-[1px] rounded-[46px] w-[344px] h-[42px] flex-shrink-0"
            style={{
              background:
                "linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)",
            }}
          >
            <div
              className="w-full h-full rounded-[46px] flex flex-row items-center justify-between pl-[6px] pr-[6px]"
              style={{
                background:
                  "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
              }}
            >
              <div className="flex items-center gap-[4px]">
                <img
                  src={logo}
                  alt="Nanis Logo"
                  className="w-[26px] h-[26px]"
                />
                <span className="font-brand font-semibold text-[19.35px] leading-[100%] tracking-[0px] text-brand-dark">
                  Mail<span className="text-brand-blue">App</span>
                </span>
              </div>
            </div>
          </div>

          <div
            className="w-[344px] rounded-[29px] pt-[4px] px-[4px] pb-[12px] flex flex-col items-center border border-white backdrop-blur-md flex-shrink-0"
            style={{
              background:
                "linear-gradient(135.75deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.16) 100%)",
            }}
          >
            <div
              className="w-[336px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[12px] box-border"
              style={{
                background:
                  "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
              }}
            >
              <h2 className="font-sans font-medium text-[18px] text-[#0F172A]">
                Sign in
              </h2>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-[12px]"
              >
                {error && (
                  <p className="font-sans text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}
                <div className="flex flex-col gap-[6px]">
                  <label className="font-sans font-medium text-[13px] text-[#0F172A]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-[40px] rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400 border border-gray-200 font-sans"
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <label className="font-sans font-medium text-[13px] text-[#0F172A]">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-[40px] rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400 border border-gray-200 font-sans"
                    autoComplete="current-password"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-[32px] rounded-[100px] flex items-center justify-center gap-[4px] shadow-signup-btn text-white font-sans text-[13px] font-medium mt-[4px] hover:opacity-95 transition-opacity disabled:opacity-70"
                  style={{
                    background:
                      "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
                  }}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </motion.button>
              </form>
              <div className="flex items-center justify-center gap-[4px] pt-2">
                <span className="font-sans font-normal text-[14px] text-[#0F172A]">
                  Don&apos;t have an account?{" "}
                </span>
                <Link
                  to="/signup"
                  className="font-sans font-medium text-[14px] text-[#335CFF] hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
