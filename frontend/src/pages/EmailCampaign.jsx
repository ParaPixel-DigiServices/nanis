import React from "react";
import { Search, Bell, Filter, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import boxIcon from "../assets/box.svg";

const EmailCampaigns = () => {
  const headerTitleStyle = {
    fontFamily: '"Inter Display", sans-serif',
    fontWeight: 600,
    fontSize: "24px",
    lineHeight: "120%",
    letterSpacing: "-0.02em",
    color: "#0E121B",
  };

  const glassInputStyle = {
    background:
      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  };

  const sortingContainerStyle = {
    width: "407px",
    height: "34px",
    borderRadius: "46px",
    padding: "4px",
    gap: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background:
      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
  };

  const activeTabStyle = {
    background:
      "linear-gradient(135.75deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow:
      "0px 5px 5px 0px #00000008, 0px 0px 2px 0px #0000001A, 0px 1px 1px 0px #00000008",
    backdropFilter: "blur(20px)",
    color: "#0F172A",
    fontWeight: 600,
    borderRadius: "99px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "40px",
  };

  const inactiveTabStyle = {
    background: "transparent",
    border: "none",
    boxShadow: "none",
    color: "#64748B",
    fontWeight: 500,
    fontSize: "12px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  };

  const blueButtonStyle = {
    background: "linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)",
    boxShadow: `
      0px 0px 0px 1px rgba(134, 140, 152, 0.2), 
      0px 0px 0px 0.5px #335CFF, 
      inset 2px 4px 3px 0px rgba(255, 255, 255, 0.08), 
      0px 2px 2px 0px rgba(52, 55, 72, 0.2)
    `,
    color: "white",
    border: "none",
  };

  return (
    <div
      className="flex flex-col w-full h-full font-sans overflow-hidden bg-transparent"
      style={{
        paddingTop: "16px",
        paddingBottom: "16px",
      }}
    >
      {/* HEADER */}
      <header
        className="flex items-center justify-between shrink-0"
        style={{
          height: "93px",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingBottom: "15px",
          gap: "12px",
        }}
      >
        <h1 style={headerTitleStyle}>Email</h1>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search Campaigns, Users..."
              style={{
                ...glassInputStyle,
                width: "280px",
                height: "32px",
                borderRadius: "99px",
                paddingLeft: "16px",
                paddingRight: "36px",
                fontSize: "13px",
                outline: "none",
                color: "#0F172A",
              }}
              className="placeholder:text-slate-400 font-medium"
            />
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
          </div>

          <button
            className="flex items-center justify-center hover:scale-105 transition-transform"
            style={{
              ...glassInputStyle,
              width: "32px",
              height: "32px",
              borderRadius: "99px",
              padding: "8px",
            }}
          >
            <Bell size={14} className="text-slate-600" />
          </button>

          <button
            className="flex items-center justify-center relative hover:scale-105 transition-transform"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "99px",
              background: "#EBF1FF",
              border: "1px solid rgba(255,255,255,0.4)",
              fontSize: "11px",
              fontWeight: "700",
              color: "#335CFF",
            }}
          >
            SC
            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-[1px] border border-white">
              <Check size={6} strokeWidth={4} color="white" />
            </div>
          </button>
        </div>
      </header>

      {/* SUB HEADER */}
      <div
        className="flex items-center justify-between shrink-0 px-4 mb-4"
        style={{ height: "34px" }}
      >
        <div style={sortingContainerStyle}>
          {[
            "All",
            "Draft",
            "Published",
            "Scheduled",
            "Sending",
            "Suspended",
          ].map((tab) => {
            const isAll = tab === "All";
            return (
              <button
                key={tab}
                style={isAll ? activeTabStyle : inactiveTabStyle}
                className="transition-colors hover:text-slate-800"
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center"
          style={{ gap: "8px", height: "32px" }}
        >
          <button
            className="flex items-center gap-2 justify-center hover:bg-white/40 transition-colors"
            style={{
              ...glassInputStyle,
              width: "77px",
              height: "32px",
              borderRadius: "99px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#0F172A",
            }}
          >
            <Filter size={14} strokeWidth={2.5} />
            <span>Filter</span>
          </button>
          <button
            className="flex items-center gap-1.5 justify-center hover:opacity-95 transition-opacity active:scale-95"
            style={{
              ...blueButtonStyle,
              width: "134px",
              height: "32px",
              borderRadius: "58px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <Plus size={14} strokeWidth={3} />
            <span>Email Campaign</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
          style={{ width: "720px", gap: "12px" }}
        >
          <div className="relative mb-4">
            <img
              src={boxIcon}
              alt="No Campaigns"
              style={{ width: "74px", height: "74px", objectFit: "contain" }}
            />
            <svg
              className="absolute -top-8 -right-8 w-20 h-20 text-slate-800 pointer-events-none"
              viewBox="0 0 100 100"
              style={{ opacity: 0.8 }}
            >
              <path
                d="M30,80 Q50,20 80,30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
              <path
                d="M75,25 L80,30 L85,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-[18px] font-bold text-[#0F172A]">
            No email campaigns yet
          </h3>
          <p className="text-slate-500 text-[13px] leading-relaxed mb-4 font-medium">
            You haven't created any email campaigns. Start your first campaign
            to reach your audience.
          </p>
          <button
            className="flex items-center justify-center hover:opacity-95 transition-opacity active:scale-95"
            style={{
              ...blueButtonStyle,
              width: "134px",
              height: "32px",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Create Campaign
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default EmailCampaigns;
