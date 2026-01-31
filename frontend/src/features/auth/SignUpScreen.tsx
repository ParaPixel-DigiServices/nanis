import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Globe } from 'lucide-react'; 
import clsx from 'clsx'; 

import googleLogo from '../../assets/google.svg'; 
import appleLogo from '../../assets/apple.svg';
import trialIcon from '../../assets/trial.svg'; 
import logo from '../../assets/logo.svg'; 

const SignUpScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  
  const [validations, setValidations] = useState({
    length: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden relative">
      
      {/* SCALING WRAPPER (Only for the Card & Logo) */}
      <div className="flex flex-col items-center gap-[20px] transform origin-center scale-100 mbp:scale-125">

        {/* --- TOP CAPSULE --- */}
        <div 
          className="p-[1px] rounded-[46px] w-[344px] h-[42px] flex-shrink-0"
          style={{
            background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)'
          }}
        >
          <div 
            className="w-full h-full rounded-[46px] flex flex-row items-center justify-between pl-[6px] pr-[6px]"
            style={{
              background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)'
            }}
          >
            <div className="flex items-center gap-[4px]">
              <img src={logo} alt="Nanis Logo" className="w-[26px] h-[26px]" />
              <span className="font-brand font-semibold text-[19.35px] leading-[100%] tracking-[0px] text-brand-dark">
                Mail<span className="text-brand-blue">App</span>
              </span>
            </div>

            <div className="flex items-center gap-[5px] pl-[7.5px] pr-[7.5px] py-[5px] bg-white rounded-[57.47px]">
              <img src={trialIcon} alt="trial" className="w-[15px] h-[15px] rounded-[3px]" />
              <span className="font-sans font-medium text-[12.49px] text-[#34C759] leading-none">Trial</span>
            </div>
          </div>
        </div>

        {/* --- MAIN FORM CARD --- */}
        <div 
          className="w-[344px] h-[524px] rounded-[29px] pt-[4px] px-[4px] pb-[12px] flex flex-col items-center justify-between border border-white backdrop-blur-md flex-shrink-0"
          style={{
            background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.16) 100%)'
          }}
        >
            <div 
              className="w-[336px] h-[476px] rounded-[26px] p-[12px] border border-white flex flex-col gap-[12px] box-border"
              style={{
                background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)'
              }}
            >
              
              {/* --- FORM FIELDS --- */}
              <div className="w-full flex flex-col gap-[12px]">
                <div className="flex flex-col gap-[6px]">
                  <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">Full Name</label>
                  <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
                    <input type="text" placeholder="Enter your full name" className="w-full h-full rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-[6px]">
                  <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A]">Email</label>
                  <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
                    <input type="email" placeholder="Enter your email address" className="w-full h-full rounded-[9px] bg-white px-[12px] text-[13px] outline-none placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-[6px]">
                  <label className="font-sans font-medium text-[13px] leading-[20px] tracking-[-0.01em] text-[#0F172A] relative w-fit">
                    Password<span className="absolute -top-1 -right-2 text-brand-blue text-[10px]">*</span>
                  </label>
                  <div className="p-[1px] rounded-[10px] w-full h-[40px] bg-gradient-to-br from-white/40 to-white/10">
                    <div className="w-full h-full rounded-[9px] bg-white flex items-center px-[12px]">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="flex-1 h-full text-[13px] outline-none bg-transparent placeholder:text-gray-400"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-[4px] mt-[2px]">
                    <ValidationPill text="8 Characters" isValid={validations.length} />
                    <ValidationPill text="Numbers" isValid={validations.number} />
                    <ValidationPill text="Special character" isValid={validations.special} />
                  </div>
                </div>

                <div className="flex items-center gap-[8px] h-[17px] mt-[2px]">
                  <input type="checkbox" className="w-[16px] h-[16px] rounded-[4px] border border-[#E1E4EA] bg-white checked:bg-brand-blue appearance-none cursor-pointer" /> 
                  <p className="font-sans font-medium text-[14px] leading-none">
                    I agree to Nanis' <span className="underline decoration-solid cursor-pointer hover:text-brand-blue">Terms & Privacy</span>
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-[32px] rounded-[100px] flex items-center justify-center gap-[4px] shadow-signup-btn text-white font-sans text-[13px] font-medium mt-[4px] hover:opacity-95 transition-opacity"
                  style={{ background: 'linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)' }}
                >
                  Sign up
                </motion.button>
              </div>

              <div className="flex items-center justify-between w-full h-[20px]">
                <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
                <span className="font-sans font-normal text-[14px] text-[#0F172A] px-4">Or</span>
                <div className="h-[1px] bg-[#E1E4EA] flex-1"></div>
              </div>

              <div className="flex flex-col gap-[6px] w-full">
                <button className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors">
                  <img src={googleLogo} alt="G" className="w-[20px] h-[20px]" />
                  <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">Sign in with Google</span>
                </button>
                <button className="w-full h-[36px] bg-white rounded-[10px] flex items-center justify-center gap-[8px] border border-white/50 shadow-sm hover:bg-gray-50 transition-colors">
                  <img src={appleLogo} alt="A" className="w-[20px] h-[20px]" />
                  <span className="font-sans font-semibold text-[13px] tracking-[-0.01em] text-[#0F172A]">Sign in with Apple</span>
                </button>
              </div>

            </div>

            <div className="w-full flex items-center justify-center gap-[4px] h-[20px] pb-1">
                <span className="font-sans font-normal text-[14px] text-[#0F172A]">Already have an account?</span>
                <a href="#" className="font-sans font-medium text-[14px] text-[#335CFF] hover:underline">Sign in</a>
            </div>

        </div>
      </div>

      {/* --- FOOTER BUTTON --- 
          ABSOLUTE POSITIONED: 
          - bottom-[30px]: Pushed up slightly from the very edge for aesthetics.
          - left-1/2 -translate-x-1/2: Perfectly centered horizontally.
      */}
      <div 
        className="absolute bottom-[30px] left-1/2 transform -translate-x-1/2 w-[190px] h-[36px] p-[1px] rounded-[16px]"
        style={{
          background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%)'
        }}
      >
        <a 
          href="https://nanis.com" 
          className="w-full h-full rounded-[15px] flex items-center justify-center gap-[4px] p-[4px] no-underline hover:opacity-90 transition-opacity cursor-pointer"
          style={{
            background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)'
          }}
        >
           <Globe size={16} color="#7C3AED" strokeWidth={2} />
           <span className="font-sans font-medium text-[13px] text-[#7C3AED] leading-none">
              Go back to Nanis.com
           </span>
        </a>
      </div>

    </div>
  );
};

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