import React from 'react';

/**
 * Official ZipZap Logo Component
 * Uses the authentic brand emblem image (/portal/zip-zap.png or /zip-zap.png)
 * with custom dimensions and crisp typography
 */
export default function ZipZapLogo({
  size = 38,
  showText = true,
  stacked = false,
  subtitle = 'Jobs',
  className = '',
  textClassName = ''
}) {
  return (
    <div className={`flex items-center gap-2.5 select-none shrink-0 group ${className}`}>
      {/* Authentic Brand Emblem Image */}
      <img
        src="/portal/zip-zap.png"
        alt="ZipZap"
        width={size}
        height={size}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/zip-zap.png';
        }}
        className="rounded-xl object-contain drop-shadow-xs group-hover:scale-105 transition-transform shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      />

      {/* Styled Brand Text */}
      {showText && (
        <div className={`flex flex-col leading-tight ${textClassName}`}>
          {stacked ? (
            <div className="flex flex-col -space-y-0.5">
              <span className="text-xl font-black tracking-tight text-[#002262]">
                Zip<span className="text-[#01ABB9]">Zap</span>
              </span>
              <span className="text-sm font-extrabold text-[#1E60FF] tracking-wide">
                {subtitle}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#002262]">
                Zip<span className="text-[#01ABB9]">Zap</span>
              </span>
              <span className="text-base sm:text-lg font-black text-[#1E60FF] tracking-tight">
                {subtitle}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
