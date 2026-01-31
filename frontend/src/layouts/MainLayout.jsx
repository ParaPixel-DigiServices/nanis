import React from 'react';

const MainLayout = ({ children }) => {
  return (
    <div className="w-full min-h-screen flex justify-center bg-gray-900"> 
      {/* Change bg-gray-900 to your design's background color */}
      
      <div className="w-full max-w-[1728px] relative bg-white shadow-2xl overflow-hidden">
        {/* This inner div is your CANVAS. It will mimic the Figma Frame exactly. */}
        {children}
      </div>
    </div>
  );
};

export default MainLayout;