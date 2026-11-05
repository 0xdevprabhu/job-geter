import React from 'react';

/**
 * Official ZipZap Logo Component
 * Uses the authentic brand emblem with custom dimensions and typography
 */
export default function ZipZapLogo({ size = 38, showText = true, className = '', textClassName = '' }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 select-none shrink-0 ${className}`}>
      {/* Brand Icon Image */}
      <img
        src="/portal/zip-zap.png"
        alt="ZipZap"
        width={size}
        height={size}
        className="rounded-xl object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
        style={{ width: `${size}px`, height: `${size}px` }}
      />

      {/* Styled Brand Text */}
      {showText && (
        <div className={`flex flex-col ${textClassName}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-lg sm:text-2xl font-black tracking-tight text-[#002262]">
              Zip<span className="text-[#01ABB9]">Zap</span>
            </span>
            <span className="inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-[#002262] text-[#01ABB9] border border-[#01ABB9]/30 shadow-xs">
              Portal
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5 hidden sm:block">
            Multi-Portal Job Aggregator
          </span>
        </div>
      )}
    </div>
  );
}

