import React from 'react';

/**
 * Official Traptip Logo Component
 * Uses the authentic brand emblem image (/traptip.png or /portal/traptip.png)
 * with custom dimensions and crisp typography
 */
export default function TraptipLogo({
  size = 38,
  showText = true,
  stacked = false,
  subtitle = 'Jobs',
  className = '',
  textClassName = ''
}) {
  return (
    <div className={`flex items-center gap-2.5 select-none shrink-0 group ${className}`}>
      {/* Authentic Traptip Brand Emblem Image */}
      <img
        src="/traptip.png"
        alt="Traptip"
        width={size}
        height={size}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/portal/traptip.png';
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
                Trap<span className="text-[#01ABB9]">tip</span>
              </span>
              <span className="text-sm font-extrabold text-[#1E60FF] tracking-wide">
                {subtitle}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#002262]">
                Trap<span className="text-[#01ABB9]">tip</span>
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

export { TraptipLogo };

