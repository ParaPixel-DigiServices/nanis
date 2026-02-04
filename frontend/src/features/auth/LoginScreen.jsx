import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Globe, Check, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";

import googleLogo from "../../assets/google.svg";
import appleLogo from "../../assets/apple.svg";
import logo from "../../assets/logo.svg";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = () => {
    setIsError(false); // Reset
    if (!email || !password || !email.includes("@")) {
      setIsError(true);
    } else {
      console.log("Login successful");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden relative font-sans">
      <div className="flex flex-col items-center transform origin-center scale-100 mbp:scale-125">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="w-[344px] h-[540px] rounded-[29px] pt-[4px] px-[4px] pb-[12px] flex flex-col items-center justify-between border border-white backdrop-blur-md flex-shrink-0"
          style={{
            background:
              "linear-gradient(135.75deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.16) 100%)",
          }}
        >
          <div
            className="w-[336px] h-[492px] rounded-[26px] p-[20px] border border-white flex flex-col gap-[12px] box-border"
            style={{
              background:
                "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
            }}
          >
            <div className="flex gap-[6px] mb-2 w-full">
              <img src={logo} alt="Nanis Logo" className="w-[32px] h-[32px]" />
              <span className="font-brand font-semibold text-[24px] leading-[100%] tracking-[0px] text-brand-dark">
                Mail<span className="text-brand-blue">App</span>
              </span>
            </div>

            {/* 2. Email Field */}
            <div className="flex flex-col gap-[6px]">
              <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">
                Email
              </label>
              <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsError(false);
                  }}
                  placeholder="Enter your email address"
                  className="w-full h-full rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400 font-sans"
                />
              </div>
            </div>

            {/* 3. Password Field (Diamond) */}
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
                  onChange={(val) => {
                    setPassword(val);
                    setIsError(false);
                  }}
                  placeholder="Enter your password"
                />
              </div>

              {/* Error Message Area */}
              <div className="min-h-[28px] mt-[2px]">
                <AnimatePresence>
                  {isError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -5 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -5 }}
                      className="flex items-center justify-between w-full px-[8px] py-[6px] bg-red-50 border border-red-100 rounded-[6px]"
                    >
                      <div className="flex items-center gap-[6px]">
                        <AlertCircle size={14} className="text-red-500" />
                        <span className="font-sans font-medium text-[11px] text-red-500 leading-none">
                          Incorrect email or password.
                        </span>
                      </div>
                      <button
                        onClick={() => setIsError(false)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 4. Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mt-[-4px]">
              <div className="flex items-center gap-[8px]">
                <CustomCheckbox />
                <span className="font-sans font-medium text-[13px] text-[#0F172A] leading-none">
                  Remember me
                </span>
              </div>
              <a
                href="#"
                className="font-sans font-medium text-[13px] text-[#335CFF] hover:underline leading-none"
              >
                Forgot password?
              </a>
            </div>

            {/* 5. Login Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              className="w-full h-[36px] rounded-[100px] flex items-center justify-center gap-[4px] shadow-signup-btn text-white font-sans text-[13px] font-medium mt-[8px] hover:opacity-95 transition-opacity"
              style={{
                background:
                  "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
              }}
            >
              Log in
            </motion.button>

            {/* 6. Divider & Socials */}
            <div className="flex items-center justify-between w-full h-[20px] mt-2">
              <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
              <span className="font-sans font-normal text-[14px] text-[#0F172A] px-4">
                Or
              </span>
              <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
            </div>

            <div className="flex flex-col gap-[8px] w-full">
              <button className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors">
                <img src={googleLogo} alt="G" className="w-[20px] h-[20px]" />
                <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">
                  Sign in with Google
                </span>
              </button>
              <button className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors">
                <img src={appleLogo} alt="A" className="w-[20px] h-[20px]" />
                <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">
                  Sign in with Apple
                </span>
              </button>
            </div>
          </div>

          {/* MOVED: Switch to Signup LINK (Now inside Outer Card) */}
          <div className="w-full flex items-center justify-center gap-[4px] mb-[2px]">
            <span className="font-sans font-normal text-[14px] text-[#0F172A]">
              Don't have an account?
            </span>
            <Link
              to="/signup"
              className="font-sans font-medium text-[14px] text-[#335CFF] hover:underline"
            >
              Sign up
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer Button */}
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
          !showPassword && "tracking-widest",
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

const CustomCheckbox = () => (
  <div className="relative flex items-center justify-center w-[16px] h-[16px]">
    <input
      type="checkbox"
      className="peer appearance-none w-[16px] h-[16px] rounded-[4px] border border-[#E1E4EA] bg-white cursor-pointer checked:bg-brand-blue checked:border-transparent transition-all duration-200"
    />
    <Check
      size={12}
      strokeWidth={3}
      className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200"
    />
  </div>
);

export default LoginPage;
