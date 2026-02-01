import React from 'react';
import { 
  LayoutDashboard, Inbox, PieChart, LayoutTemplate, Users, Link as LinkIcon, FolderOpen,
  Mail, Globe, GitFork, Smartphone, Rss, Share2, FlaskConical,
  Settings, HelpCircle, Plus, Crown, ChevronDown
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import logo from '../assets/logo.svg';

// --- Reusable Glass Container Style ---
const containerStyle = {
  width: '190px',
  borderRadius: '16px',
  padding: '4px',
  gap: '4px',
  background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  display: 'flex',
  flexDirection: 'column',
};

// --- Nav Item Component ---
const NavItem = ({ icon: Icon, label, to, active, hasDot, count }) => (
  <NavLink 
    to={to || "#"}
    className={({ isActive }) => clsx(
      "flex items-center gap-3 px-2 rounded-lg transition-all duration-200 group h-[28px] shrink-0",
      (isActive || active) ? "text-slate-900 font-semibold" : "text-slate-900 font-medium hover:bg-white/40"
    )}
  >
    <Icon size={16} strokeWidth={2} className="text-slate-800 shrink-0" />
    <span 
      className="text-[13px] leading-[20px] font-medium text-[#0F172A] truncate"
      style={{ fontFamily: '"Inter Display", sans-serif' }}
    >
      {label}
    </span>
    
    <div className="ml-auto flex items-center gap-1">
      {/* --- UPDATED: Blinking Glow Dot --- */}
      {hasDot && (
        <div className="relative flex h-2 w-2 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
        </div>
      )}
      
      {count && <span className="text-[10px] font-medium text-slate-500 bg-white/50 px-1.5 rounded-md">{count}</span>}
    </div>
  </NavLink>
);

const Sidebar = () => {
  return (
    <aside 
      className="flex flex-col h-screen overflow-y-auto custom-scrollbar flex-shrink-0 z-20 border-r border-white/20"
      style={{ 
        width: '222px', 
        padding: '16px',
        gap: '12px' 
      }}
    >
      
      {/* ================= TOP GROUP ================= */}
      
      {/* 1. TOP CAPSULE (Logo) */}
      <div 
        className="flex items-center justify-between px-1.5 shrink-0"
        style={{ 
          width: '190px', 
          height: '36px', 
          borderRadius: '46px',
          background: 'linear-gradient(135.75deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.48) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-slate-900 rounded-full text-white" style={{ width: '21px', height: '21px' }}>
             <img src={logo} alt="Logo" className="w-full h-full" />
          </div>
          <span 
            className="text-[20px] font-bold text-[#0F172A] leading-none tracking-tight flex items-center mt-0.5"
            style={{ fontFamily: '"FONTSPRING DEMO - Visby CF Demi Bold", sans-serif' }}
          >
            Mail<span className="text-blue-600">App</span>
          </span>
        </div>
        
        <div 
            className="bg-white flex items-center gap-1 justify-center"
            style={{ width: '44px', height: '24px', borderRadius: '46px', padding: '4px 6px' }}
        >
           <Crown size={8} className="fill-orange-500 text-orange-500" />
           <span className="text-[9px] font-bold text-orange-500 uppercase">Pro</span>
        </div>
      </div>

      {/* 2. GENERAL CONTAINER */}
      <div style={{ ...containerStyle, height: 'auto' }}>
        <div className="px-3 mt-1 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontFamily: '"Inter Display", sans-serif' }}>General</div>
        <NavItem icon={LayoutDashboard} label="Dashboard" />
        <NavItem icon={Inbox} label="Inbox" hasDot />
        <NavItem icon={PieChart} label="Analytics" />
        <NavItem icon={LayoutTemplate} label="Templates" />
        <NavItem icon={Users} label="Contacts" />
        <NavItem icon={LinkIcon} label="Integrations" />
        <NavItem icon={FolderOpen} label="File Manager" />
      </div>

      {/* 3. CAMPAIGNS CONTAINER */}
      <div style={{ ...containerStyle, height: 'auto' }}>
         <div className="px-3 mt-1 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontFamily: '"Inter Display", sans-serif' }}>Campaigns</div>
         <NavItem icon={Mail} label="Email" to="/campaigns/email" active />
         <NavItem icon={Globe} label="Website" />
         <NavItem icon={GitFork} label="Automation" />
         <NavItem icon={Smartphone} label="SMS" />
         <NavItem icon={Rss} label="RSS" />
         <NavItem icon={Share2} label="Social Media" />
         <NavItem icon={FlaskConical} label="A/B Testing" />
      </div>

      {/* 4. FOLDERS CONTAINER */}
      <div style={{ ...containerStyle, height: 'auto' }}>
         <div className="flex items-center justify-between px-3 mt-1 mb-1 cursor-pointer group">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontFamily: '"Inter Display", sans-serif' }}>Folders</span>
             <ChevronDown size={12} className="text-slate-400" />
         </div>
         <NavItem icon={FolderOpen} label="Dubai Event" count="3" />
         <NavItem icon={FolderOpen} label="UK Promotions" count="3" />
         
         <button className="flex items-center gap-2 px-2 py-1.5 mt-0.5 text-blue-600 hover:bg-white/40 rounded-lg transition-colors text-left w-full h-[28px]">
            <Plus size={16} />
            <span className="text-[12px] font-bold" style={{ fontFamily: '"Inter Display", sans-serif' }}>New Folders</span>
         </button>
      </div>

      {/* ================= SPACER ================= */}
      <div className="flex-1 min-h-[20px]"></div>

      {/* ================= BOTTOM GROUP ================= */}

      {/* 5. USAGE CONTAINER */}
      <div style={{ ...containerStyle, height: '130px', padding: '8px', justifyContent: 'space-between' }}>
        <div className="flex items-center justify-between" style={{ height: '20px' }}>
            <span className="text-[13px] font-semibold text-[#0F172A]" style={{ fontFamily: '"Inter Display", sans-serif' }}>Salesync LLC</span>
            <div className="bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Crown size={8} className="fill-orange-500 text-orange-500" />
                <span className="text-[9px] font-bold text-orange-500">Pro</span>
            </div>
        </div>

        <div className="text-[11px] font-medium text-[#70707B] leading-[16px]" style={{ fontFamily: '"Inter Display", sans-serif' }}>
             3,250 / 10,000 (32.5%)
        </div>

        <div className="w-full relative overflow-hidden" style={{ height: '6px', borderRadius: '44px', border: '1px solid rgba(53, 56, 73, 0.1)', backgroundColor: 'rgba(53, 56, 73, 0.05)' }}>
             <div className="h-full rounded-full" style={{ width: '32.5%', background: 'linear-gradient(90deg, #B6B4FF 0%, #534FEB 103.77%)' }} />
        </div>
        
        <div className="text-[10px] text-slate-400" style={{ fontFamily: '"Inter Display", sans-serif' }}>Remaining: 6,750</div>

        <button 
            className="w-full flex items-center justify-center gap-1 text-white text-[11px] font-bold transition-transform active:scale-95"
            style={{
                height: '32px',
                borderRadius: '100px',
                fontFamily: '"Inter Display", sans-serif',
                background: 'linear-gradient(180deg, #335CFF -40.91%, #2E51DC 87.5%)',
                boxShadow: `0px 0px 0px 1px rgba(134, 140, 152, 0.2), 0px 0px 0px 0.5px #335CFF, inset 2px 4px 3px 0px rgba(255, 255, 255, 0.08), 0px 2px 2px 0px rgba(52, 55, 72, 0.2)`
            }}
        >
            <Crown size={12} fill="currentColor" />
            Buy More Credit
        </button>
      </div>

      {/* 6. SETTINGS CONTAINER */}
      <div style={{ ...containerStyle, height: '68px', padding: '4px' }}>
         <NavItem icon={Settings} label="Settings" />
         <NavItem icon={HelpCircle} label="Help & Support" />
      </div>

    </aside>
  );
};

export default Sidebar;