'use client';

import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

export default function StatusBar() {
  const [time, setTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-11 px-6 flex items-center justify-between select-none pointer-events-none text-white z-50 bg-black/90 backdrop-blur-md shrink-0">
      {/* Time */}
      <span className="text-[13px] font-semibold tracking-tight font-sans">
        {time}
      </span>

      {/* Dynamic Island / Center Pill */}
      <div className="w-20 h-4 bg-black rounded-full border border-white/10 flex items-center justify-end px-2 shadow-inner">
        <div className="w-2 h-2 rounded-full bg-neutral-900 border border-neutral-700/80" />
      </div>

      {/* Right Icons: Cellular + Wifi + Battery */}
      <div className="flex items-center gap-1.5">
        {/* 4-bar cellular */}
        <div className="flex items-end gap-[1.5px] h-2.5">
          <div className="w-[2.5px] h-1 bg-white rounded-[0.5px]" />
          <div className="w-[2.5px] h-1.5 bg-white rounded-[0.5px]" />
          <div className="w-[2.5px] h-2 bg-white rounded-[0.5px]" />
          <div className="w-[2.5px] h-2.5 bg-white rounded-[0.5px]" />
        </div>

        {/* Wifi */}
        <Wifi className="w-3.5 h-3.5 text-white stroke-[2.2]" />

        {/* Battery */}
        <div className="flex items-center gap-[1px]">
          <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-[1px] flex items-center">
            <div className="w-3 h-1.5 bg-white rounded-[1.5px]" />
          </div>
          <div className="w-[1.5px] h-1 bg-white/80 rounded-r-[0.5px]" />
        </div>
      </div>
    </div>
  );
}
