'use client';

import React from 'react';
import { ScreenShare } from 'lucide-react';

// This is a wrapper component for ScreenShare from lucide-react that simulates a StopScreenShare icon
// by adding styling to make it appear like a "stop" version
export function StopScreenShare({ size = 24, className = '', ...props }) {
  const combinedClassName = `${className} text-red-500`;
  
  return (
    <div className="relative">
      <ScreenShare size={size} className={combinedClassName} {...props} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3/4 h-0.5 bg-red-500 transform rotate-45"></div>
      </div>
    </div>
  );
}

export default StopScreenShare;