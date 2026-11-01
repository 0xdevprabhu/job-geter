import React from 'react';

/**
 * Official ZipZap Logo Component
 * Features a dynamic double-lightning 'Z' speed emblem with electric gradient.
 */
export default function ZipZapLogo({ size = 36, showText = true, className = '', textClassName = '' }) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 select-none shrink-0 ${className}`}>
      {/* SVG Icon Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-2xl shadow-md shadow-blue-500/20 overflow-hidden group-hover:scale-105 transition-transform"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background Gradient */}
          <defs>
            <linearGradient id="zzBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            <linearGradient id="zzBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>

            <linearGradient id="zzGlowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
            </linearGradient>

            <filter id="zzShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Squircle / Shield Base */}
          <rect width="100" height="100" rx="26" fill="url(#zzBgGrad)" />

          {/* Subtle Cyber Grid Lines in background */}
          <circle cx="50" cy="50" r="38" stroke="url(#zzGlowGrad)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
          <circle cx="50" cy="50" r="28" stroke="white" strokeWidth="1" opacity="0.15" />

          {/* First "Zip" Accent Streak (Top Left) */}
          <path
            d="M26 28 H 58 L 46 44 H 32 Z"
            fill="#38BDF8"
            opacity="0.85"
          />

          {/* Main "Zap" Lightning Bolt 'Z' Emblem */}
          <path
            d="M 32 24
               H 74
               C 76.5 24 78 26.5 76.5 28.5
               L 50 60
               H 72
               C 74 60 75 62 74 63.5
               L 40 82
               C 38 83.5 36.5 81.5 37.5 79.5
               L 48 52
               H 28
               C 25.5 52 24.5 49.5 26 47.5
               L 44 26.5
               C 45 25 43.5 24 41.5 24
               H 32 Z"
            fill="url(#zzBoltGrad)"
            filter="url(#zzShadow)"
          />

          {/* Energy Sparks */}
          <circle cx="75" cy="22" r="2.5" fill="#FDE047" />
          <circle cx="24" cy="76" r="2" fill="#38BDF8" />
          <circle cx="82" cy="56" r="2" fill="#F59E0B" opacity="0.8" />
        </svg>
      </div>

      {/* Styled Brand Text */}
      {showText && (
        <div className={`flex flex-col ${textClassName}`}>
          <div className="flex items-center gap-1 leading-none">
            <span className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
              ZipZap
            </span>
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
              Jobs
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wide mt-0.5 hidden sm:block">
            Instant Daily Job Radar
          </span>
        </div>
      )}
    </div>
  );
}

