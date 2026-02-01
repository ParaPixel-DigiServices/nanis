import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
  return (
    <div className="flex w-full h-screen overflow-hidden relative z-10">
      {/* Sidebar stays on the left.
        We do NOT wrap the right side in a glass card. 
      */}
      <Sidebar />

      {/* MAIN CONTENT AREA: 
        Pure transparent container. No background, no border, no shadow.
        It simply takes up the remaining space.
      */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative bg-transparent">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;