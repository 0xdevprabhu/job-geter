import React, { useState } from 'react';

/**
 * PortalIcon renders crisp brand logos with faithful SVG fallbacks
 * matching the inspiration design:
 * - Total Active Jobs / Briefcase
 * - Naukri (Distinctive N with red accent)
 * - Indeed (Bold i icon)
 * - LinkedIn (In badge)
 * - Glassdoor (Green Door)
 * - RemoteOK (Purple Remote)
 */
export default function PortalIcon({ source = '', className = 'w-5 h-5', showLabel = false, size = 20 }) {
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
    // Vector SVG Icons with crisp brand geometry
    if (norm.includes('linkedin')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0A66C2" />
          <path
            d="M8.2 18H5.8V9.5h2.4V18ZM7 8.3c-.8 0-1.4-.6-1.4-1.4 0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4c0 .8-.6 1.4-1.4 1.4Zm11.8 9.7h-2.4v-4.2c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.5-.1.8V18h-2.4s.03-7.7 0-8.5h2.4v1.2c.3-.5 1-1.3 2.3-1.3 1.7 0 3 1.1 3 3.5V18Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    } else if (norm.includes('indeed')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF8A00" />
          <path
            d="M13.2 15.2c0 .8-.1 1.4-.3 1.7-.2.3-.5.5-.9.5-.4 0-.7-.2-.9-.5-.2-.3-.3-.9-.3-1.7V9.8h2.4v5.4Zm-.3-7.4c-.2-.2-.5-.3-.9-.3-.4 0-.7.1-.9.3-.2.2-.3.5-.3.9 0 .4.1.7.3.9.2.2.5.3.9.3.4 0 .7-.1.9-.3.2-.2.3-.5.3-.9 0-.4-.1-.7-.3-.9Z"
            fill="#FFFFFF"
          />
          <circle cx="12" cy="7.8" r="1.2" fill="#FFFFFF" />
        </svg>
      );
    } else if (norm.includes('naukri')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#4F46E5" />
          <path d="M7 17V7l5.5 6.5V7H15v10l-5.5-6.5V17H7Z" fill="#FFFFFF" />
          <circle cx="16.5" cy="7.5" r="1.8" fill="#F43F5E" />
        </svg>
      );
    } else if (norm.includes('glassdoor')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#10B981" />
          <path
            d="M17.5 7H6.5C5.7 7 5 7.7 5 8.5v7c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5v-7c0-.8-.7-1.5-1.5-1.5Zm-8 7.5H8v-5h1.5v5Zm7 0h-5c-.8 0-1.5-.7-1.5-1.5v-2c0-.8.7-1.5 1.5-1.5h5v1.2h-5v2.6h5v1.2Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    } else if (norm.includes('remoteok') || norm.includes('remote ok')) {
      iconElement = (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#8B5CF6" />
          <circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M6 12h12M12 6c1.8 1.8 2.5 4.2 2.5 6s-.7 4.2-2.5 6c-1.8-1.8-2.5-4.2-2.5-6s.7-4.2 2.5-6Z" stroke="#FFFFFF" strokeWidth="1.5" />
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
