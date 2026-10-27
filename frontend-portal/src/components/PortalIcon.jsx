import React, { useState } from 'react';

/**
 * PortalIcon renders brand images from the portal folder:
 * - /portal/naukri.png
 * - /portal/indeed.jpg
 * - /portal/linkedin.avif
 * - /portal/glassdoor.png
 * With graceful SVG fallbacks.
 */
export default function PortalIcon({ source = '', className = 'w-5 h-5', showLabel = false }) {
  const norm = (source || '').toLowerCase().trim();
  const [imgError, setImgError] = useState(false);

  let label = source || 'Job Portal';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let imageSrc = null;

  if (norm.includes('linkedin')) {
    label = 'LinkedIn';
    badgeColor = 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20';
    imageSrc = '/portal/linkedin.avif';
  } else if (norm.includes('indeed')) {
    label = 'Indeed';
    badgeColor = 'bg-[#2164F3]/10 text-[#2164F3] border-[#2164F3]/20';
    imageSrc = '/portal/indeed.jpg';
  } else if (norm.includes('naukri')) {
    label = 'Naukri';
    badgeColor = 'bg-[#004ECC]/10 text-[#004ECC] border-[#004ECC]/20';
    imageSrc = '/portal/naukri.png';
  } else if (norm.includes('glassdoor')) {
    label = 'Glassdoor';
    badgeColor = 'bg-[#0CAA41]/10 text-[#0CAA41] border-[#0CAA41]/20';
    imageSrc = '/portal/glassdoor.png';
  } else if (norm.includes('remoteok') || norm.includes('remote ok')) {
    label = 'RemoteOK';
    badgeColor = 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20';
  }

  // Render Image if available and not errored
  let iconElement = null;

  if (imageSrc && !imgError) {
    iconElement = (
      <img
        src={imageSrc}
        alt={label}
        className={`${className} object-contain rounded-md shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  } else {
    // High-resolution SVG Fallback
    if (norm.includes('linkedin')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.5a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63A1.63 1.63 0 0 0 7.86 6.5Z" />
        </svg>
      );
    } else if (norm.includes('indeed')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="#2164F3">
          <path d="M13.62 14.53c0 .87-.1 1.47-.32 1.83-.2.35-.55.53-1.02.53-.45 0-.78-.17-.98-.5-.2-.33-.3-.94-.3-1.85V8.89h2.62v5.64m-.32-7.85c-.24-.25-.56-.37-.96-.37-.4 0-.73.12-.97.37-.24.25-.36.56-.36.95 0 .38.12.7.36.95.24.25.56.37.97.37.4 0 .72-.12.96-.37.24-.25.37-.57.37-.95 0-.39-.13-.7-.37-.95m8.49 7.64c0 1.5-.32 2.76-.96 3.77-.64 1.01-1.57 1.8-2.79 2.37-1.22.57-2.67.86-4.34.86-1.59 0-3.04-.26-4.36-.78-1.32-.52-2.31-1.28-2.98-2.28-.67-1-1-2.2-1-3.6 0-1.48.33-2.74 1-3.79.67-1.05 1.67-1.87 2.99-2.45 1.32-.58 2.77-.87 4.35-.87 1.63 0 3.09.29 4.39.87 1.3.58 2.29 1.4 2.97 2.45.68 1.05 1.02 2.31 1.02 3.79m-3.4 0c0-1.12-.22-2-.66-2.66-.44-.66-1.16-.99-2.15-.99-1.01 0-1.74.33-2.19.99-.45.66-.68 1.54-.68 2.66 0 1.13.23 2.01.68 2.66.45.65 1.18.98 2.19.98.99 0 1.71-.33 2.15-.98.44-.65.66-1.53.66-2.66Z" />
        </svg>
      );
    } else if (norm.includes('naukri')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#004ECC" />
          <path d="M7 17V7l5.5 6.5V7H15v10l-5.5-6.5V17H7Z" fill="#FFFFFF" />
          <circle cx="16.5" cy="7.5" r="1.5" fill="#FF7555" />
        </svg>
      );
    } else if (norm.includes('glassdoor')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="#0CAA41">
          <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2C22 5 21 4 19.8 4ZM7 16H5V8h2v8Zm12 0h-6.5c-1.4 0-2.5-1.1-2.5-2.5v-3C10 9.1 11.1 8 12.5 8H19v2h-6.5c-.3 0-.5.2-.5.5v3c0 .3.2.5.5.5H19v2Z" />
        </svg>
      );
    } else if (norm.includes('remoteok') || norm.includes('remote ok')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#8B5CF6" />
          <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1 14.93V17c-2.21 0-4-1.79-4-4h1.5a2.5 2.5 0 0 0 2.5 2.5v2.43c-1.3-.23-2.45-.78-3.41-1.57ZM12 6a6 6 0 0 1 5.91 5h-2.02A4.01 4.01 0 0 0 12 8V6Zm1 12.93V15.5a2.5 2.5 0 0 0 2.5-2.5H17c0 2.21-1.79 4-4 4v2.43c.35-.06.69-.15 1.02-.27-.34.1-.67.19-1.02.27Z" fill="#FFFFFF" />
        </svg>
      );
    } else {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="20" height="14" x="2" y="7" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    }
  }

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeColor}`}>
        {iconElement}
        <span>{label}</span>
      </span>
    );
  }

  return iconElement;
}
