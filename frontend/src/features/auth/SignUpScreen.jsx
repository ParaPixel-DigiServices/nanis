import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Globe, Check, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

// Assets
import googleLogo from "../../assets/google.svg";
import appleLogo from "../../assets/apple.svg";
import trialIcon from "../../assets/trial.svg";
import logo from "../../assets/logo.svg";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

const SignUpScreen = () => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [authError, setAuthError] = useState("");
  const [onboardError, setOnboardError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    signUp,
    signInWithOAuth,
    session,
    organizations,
    loading,
    refreshOrganizations,
  } = useAuth();
  const navigate = useNavigate();

  // First-time OAuth (or any user with session but no org): show questionnaire (step 2) so they can't skip.
  React.useEffect(() => {
    if (loading) return;
    if (session && organizations?.length > 0) {
      navigate("/campaigns/email", { replace: true });
      return;
    }
    if (
      session &&
      (!organizations || organizations.length === 0) &&
      step === 1
    ) {
      setStep(2);
    }
  }, [loading, session, organizations, step, navigate]);

  const handleFinishOnboard = async () => {
    setOnboardError("");
    if (!session?.access_token) return;
    const name = businessName.trim();
    const s = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!name) {
      setOnboardError("Business name is required.");
      return;
    }
    if (!SLUG_REGEX.test(s)) {
      setOnboardError(
        "Slug must be 1–64 characters: lowercase letters, numbers, and hyphens only (cannot start or end with a hyphen)."
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await api("/onboard", {
        method: "POST",
        body: { name, slug: s },
        token: session.access_token,
        timeout: 35000,
      });
      if (res.ok) {
        await refreshOrganizations();
        navigate("/campaigns/email", { replace: true });
      } else {
        const detail = res.data?.detail;
        const msg =
          res.error ||
          (Array.isArray(detail)
            ? detail.map((e) => e.msg ?? e).join(", ")
            : detail) ||
          "Failed to create workspace";
        setOnboardError(msg);
      }
    } catch (e) {
      setOnboardError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const transitionSettings = {
    duration: 0.6,
    ease: "easeInOut",
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden relative">
      {/* SCALING WRAPPER */}
      <div className="flex flex-col items-center transform origin-center scale-100 mbp:scale-125">
        <AnimatePresence mode="wait">
          {/* ================= STEP 1: SIGN UP ================= */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              className="flex flex-col items-center gap-[20px]"
            >
              {/* TOP CAPSULE */}
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
                  <div className="flex items-center gap-[5px] pl-[7.5px] pr-[7.5px] py-[5px] bg-white rounded-[57.47px]">
                    <img
                      src={trialIcon}
                      alt="trial"
                      className="w-[15px] h-[15px] rounded-[3px]"
                    />
                    <span className="font-sans font-medium text-[12.49px] text-[#34C759] leading-none">
                      Trial
                    </span>
                  </div>
                </div>
              </div>

              {/* MAIN CARD */}
              <div
                className="w-[344px] h-[524px] rounded-[29px] pt-[4px] px-[4px] pb-[12px] flex flex-col items-center justify-between border border-white backdrop-blur-md flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135.75deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.16) 100%)",
                }}
              >
                <div
                  className="w-[336px] h-[476px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[12px] box-border"
                  style={{
                    background:
                      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
                  }}
                >
                  <StepOneForm
                    setStep={setStep}
                    fullName={fullName}
                    setFullName={setFullName}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    authError={authError}
                    setAuthError={setAuthError}
                    submitting={submitting}
                    setSubmitting={setSubmitting}
                    signUp={signUp}
                    signInWithOAuth={signInWithOAuth}
                  />
                </div>
                <div className="w-full flex items-center justify-center gap-[4px] h-[20px] pb-1">
                  <span className="font-sans font-normal text-[14px] text-[#0F172A]">
                    Already have an account?
                  </span>
                  <Link
                    to="/signin"
                    className="font-sans font-medium text-[14px] text-[#335CFF] hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= STEP 2: BUSINESS NAME ================= */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              className="w-[344px] h-[252px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[16px] box-border"
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
              <h2 className="font-sans font-medium text-[22px] leading-[120%] tracking-[-0.01em] text-[#0F172A] w-full">
                What’s the name of your business or brand?
              </h2>
              <div className="flex flex-col gap-[6px] w-full">
                <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">
                  Business name
                </label>
                <div
                  className="p-[1px] rounded-[10px] w-full h-[40px]"
                  style={{
                    background:
                      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Enter your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                    className="w-full h-full rounded-[9px] bg-white px-[12px] py-[6px] text-[13px] outline-none placeholder:text-gray-400 font-sans"
                  />
                </div>
              </div>
              <div className="flex items-center justify-start gap-[6px] w-full">
                <button
                  onClick={() => setStep(1)}
                  className="h-[32px] px-[20px] rounded-[80px] flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="font-sans font-medium text-[12px] text-black leading-none">
                    Back
                  </span>
                </button>
                <motion.button
                  onClick={() => setStep(3)}
                  whileTap={{ scale: 0.98 }}
                  className="h-[32px] px-[20px] rounded-[100px] flex items-center justify-center shadow-signup-btn text-white font-sans text-[12px] font-medium hover:opacity-95 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
                  }}
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ================= STEP 3: CUSTOM DOMAIN ================= */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              className="w-[344px] h-[252px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[16px] box-border"
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
              <h2 className="font-sans font-medium text-[22px] leading-[120%] tracking-[-0.01em] text-[#0F172A] w-full">
                Choose a custom domain for your MailApp account.
              </h2>
              <div className="flex flex-col gap-[6px] w-full">
                <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">
                  Your MailApp Domain
                </label>
                <div
                  className="p-[1px] rounded-[10px] w-full h-[40px]"
                  style={{
                    background:
                      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)",
                  }}
                >
                  <DomainInput value={slug} onChange={setSlug} />
                </div>
                {onboardError && (
                  <p className="font-sans text-[12px] text-red-600">
                    {onboardError}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-start gap-[6px] w-full">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-[32px] px-[20px] rounded-[80px] flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span className="font-sans font-medium text-[12px] text-black leading-none">
                    Back
                  </span>
                </button>
                <motion.button
                  type="button"
                  onClick={handleFinishOnboard}
                  disabled={submitting || !slug.trim() || !businessName.trim()}
                  whileTap={{ scale: 0.98 }}
                  className="h-[32px] px-[20px] rounded-[100px] flex items-center justify-center shadow-signup-btn text-white font-sans text-[12px] font-medium hover:opacity-95 transition-opacity disabled:opacity-70"
                  style={{
                    background:
                      "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
                  }}
                >
                  {submitting ? "Creating…" : "Continue"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ================= STEP 4: WELCOME VIDEO ================= */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              // Main Container: 344x430
              className="w-[344px] h-[430px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[16px] box-border"
              style={{
                background:
                  "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
              }}
            >
              {/* Logo Row */}
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

              {/* Video Container (320x244, Radius 12px) */}
              <div className="w-[320px] h-[244px] rounded-[12px] overflow-hidden bg-black flex-shrink-0 relative">
                <video
                  src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                {/* Optional: Overlay/Play Button Placeholder could go here */}
              </div>

              {/* Welcome Text */}
              <h2 className="font-sans font-medium text-[22px] leading-[120%] tracking-[-0.01em] text-[#0F172A] w-[320px]">
                Welcome to MailApp! We’re glad to have you with us.
              </h2>

              {/* Get Started Button */}
              {onboardError && (
                <p className="font-sans text-[12px] text-red-600">
                  {onboardError}
                </p>
              )}
              <motion.button
                type="button"
                disabled={submitting || !slug.trim() || !businessName.trim()}
                whileTap={{ scale: 0.98 }}
                className="w-[105px] h-[32px] rounded-[100px] flex items-center justify-center shadow-signup-btn text-white font-sans text-[12px] font-medium hover:opacity-95 transition-opacity mt-auto disabled:opacity-70"
                style={{
                  background:
                    "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
                }}
                onClick={handleFinishOnboard}
              >
                {submitting ? "Creating…" : "Get Started"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER BUTTON */}
      <div
        className="absolute bottom-[30px] left-1/2 transform -translate-x-1/2 w-[190px] h-[36px] p-[1px] rounded-[16px]"
        style={{
          background:
            "linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)",
        }}
      >
        <a
          href="https://mailapp.app"
          className="w-full h-full rounded-[15px] flex items-center justify-center gap-[4px] p-[4px] no-underline hover:opacity-90 transition-opacity cursor-pointer"
          style={{
            background:
              "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
          }}
        >
          <Globe size={16} color="#7C3AED" strokeWidth={2} />
          <span className="font-sans font-medium text-[13px] text-[#7C3AED] leading-none">
            Go back to MailApp.app
          </span>
        </a>
      </div>
    </div>
  );
};

// ... [StepOneForm, DiamondInput, DomainInput, CustomCheckbox components remain unchanged] ...
// Re-paste them if you need the full single file context.

const StepOneForm = ({
  setStep,
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  agreedToTerms,
  setAgreedToTerms,
  authError,
  setAuthError,
  submitting,
  setSubmitting,
  signUp,
  signInWithOAuth,
}) => {
  const [validations, setValidations] = useState({
    length: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!email.trim() || !password) {
      setAuthError("Please enter email and password.");
      return;
    }
    if (!agreedToTerms) {
      setAuthError("Please agree to Terms & Privacy.");
      return;
    }
    if (!validations.length || !validations.number || !validations.special) {
      setAuthError("Password must meet all requirements.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await signUp(email.trim(), password, {
      data: { full_name: fullName.trim() || undefined },
    });
    setSubmitting(false);
    if (error) {
      setAuthError(error.message || "Sign up failed.");
      return;
    }
    if (data?.session) setStep(2);
    else if (data?.user && !data.session) setStep(2); // email confirmation required
  };

  return (
    <div className="w-full flex flex-col gap-[12px]">
      {authError && (
        <p className="font-sans text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {authError}
        </p>
      )}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">
          Full Name
        </label>
        <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-full rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400 font-sans"
          />
        </div>
      </div>
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">
          Email
        </label>
        <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-full rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400 font-sans"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A] relative w-fit">
          Password
          <span className="absolute -top-1 -right-2 text-brand-blue text-[10px]">
            *
          </span>
        </label>
        <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
          <DiamondInput
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
          />
        </div>
        <div className="flex gap-[4px] mt-[2px]">
          <ValidationPill text="8 Characters" isValid={validations.length} />
          <ValidationPill text="Numbers" isValid={validations.number} />
          <ValidationPill
            text="Special character"
            isValid={validations.special}
          />
        </div>
      </div>

      <div className="flex items-center gap-[8px] h-[17px] mt-[2px]">
        <CustomCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} />
        <p className="font-sans font-medium text-[14px] leading-none">
          I agree to MailApps'{" "}
          <span className="underline decoration-solid cursor-pointer hover:text-brand-blue">
            Terms & Privacy
          </span>
        </p>
      </div>

      <motion.button
        type="button"
        onClick={handleSignUp}
        disabled={submitting}
        whileTap={{ scale: 0.98 }}
        className="w-full h-[32px] rounded-[100px] flex items-center justify-center gap-[4px] shadow-signup-btn text-white font-sans text-[13px] font-medium mt-[4px] hover:opacity-95 transition-opacity disabled:opacity-70"
        style={{
          background: "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
        }}
      >
        {submitting ? "Signing up…" : "Sign up"}
      </motion.button>

      <div className="flex items-center justify-between w-full h-[20px]">
        <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
        <span className="font-sans font-normal text-[14px] text-[#0F172A] px-4">
          Or
        </span>
        <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
      </div>
      <div className="flex flex-col gap-[6px] w-full">
        <button
          type="button"
          onClick={() => signInWithOAuth("google")}
          className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <img src={googleLogo} alt="G" className="w-[20px] h-[20px]" />
          <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">
            Sign in with Google
          </span>
        </button>
        <button
          type="button"
          onClick={() => signInWithOAuth("apple")}
          className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <img src={appleLogo} alt="A" className="w-[20px] h-[20px]" />
          <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">
            Sign in with Apple
          </span>
        </button>
      </div>
    </div>
  );
};

const DiamondInput = ({ value, onChange, placeholder }) => {
  const [showPassword, setShowPassword] = useState(false);
  const handleChange = (e) => {
    if (showPassword) {
      onChange(e.target.value);
      return;
    }
    const newVal = e.target.value;
    const oldLen = value.length;
    const newLen = newVal.length;
    if (newLen > oldLen) {
      onChange(value + newVal.slice(-1));
    } else if (newLen < oldLen) {
      onChange(value.slice(0, newLen));
    }
  };
  const displayValue = showPassword ? value : "✦".repeat(value.length);
  return (
    <div className="w-full h-full rounded-[9px] bg-white flex items-center px-[12px]">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          "flex-1 h-full text-[13px] outline-none bg-transparent placeholder:text-gray-400 font-sans",
          !showPassword && "tracking-widest"
        )}
      />
      <button
        onClick={() => setShowPassword(!showPassword)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const DomainInput = ({ value = "", onChange }) => {
  const domain = value ?? "";
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!domain) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const timer = setTimeout(() => {
      const takenDomains = ["taken", "test", "admin"];
      if (takenDomains.includes(domain.toLowerCase())) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [domain]);

  return (
    <div className="w-full h-full rounded-[9px] bg-white flex items-center px-[12px] relative">
      <div className="flex-1 flex items-center h-full mr-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="yourname"
          className={clsx(
            "w-1/2 h-full text-[13px] outline-none bg-transparent placeholder:text-gray-400 font-sans",
            status === "error" ? "text-red-500" : "text-[#0F172A]"
          )}
        />
        <span className="text-[13px] text-[#0F172A] font-sans font-medium whitespace-nowrap pl-1">
          @mailapp.app
        </span>
      </div>
      <div className="w-[16px] h-[16px] flex items-center justify-center flex-shrink-0">
        {status === "loading" && (
          <Loader2 className="animate-spin text-gray-400" size={16} />
        )}
        {status === "success" && (
          <Check size={16} color="#34C759" strokeWidth={3} />
        )}
        {status === "error" && <X size={16} color="#EF4444" strokeWidth={3} />}
      </div>
    </div>
  );
};

const CustomCheckbox = ({ checked, onChange }) => (
  <div className="relative flex items-center justify-center w-[16px] h-[16px]">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange?.(e.target.checked)}
      className="peer appearance-none w-[16px] h-[16px] rounded-[4px] border border-[#E1E4EA] bg-white cursor-pointer checked:bg-brand-blue checked:border-transparent transition-all duration-200"
    />
    <Check
      size={12}
      strokeWidth={3}
      className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200"
    />
  </div>
);

const ValidationPill = ({ text, isValid }) => (
  <div
    className={clsx(
      "px-[8px] py-[4px] border rounded-full flex items-center justify-center h-[23px] transition-all duration-300",
      isValid
        ? "bg-[#34C759]/10 border-[#34C759]"
        : "bg-surface-dark border-surface-border"
    )}
  >
    <span
      className={clsx(
        "font-sans font-medium text-[10px] leading-none whitespace-nowrap transition-colors duration-300",
        isValid ? "text-[#34C759]" : "text-gray-500"
      )}
    >
      {text}
    </span>
  </div>
);

export default SignUpScreen;
