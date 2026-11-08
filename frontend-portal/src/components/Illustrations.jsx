import React from 'react';

/**
 * Modern Hero Illustration: Developer with laptop, desk, dream job briefcase badge
 */
export function HeroIllustration({ className = 'w-64 h-40' }) {
  return (
    <svg
      viewBox="0 0 360 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="heroBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="briefcaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="shadowFilter" x="-10%" y="-10%" width="125%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1E40AF" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Background Soft Blobs */}
      <circle cx="280" cy="120" r="70" fill="url(#heroBgGrad)" />
      <path
        d="M200 170 C240 140, 310 140, 350 170 C360 180, 350 200, 310 200 L190 200 Z"
        fill="#DBEAFE"
        opacity="0.6"
      />

      {/* Floating Dream Job Badge */}
      <g filter="url(#shadowFilter)">
        <rect x="250" y="26" width="94" height="30" rx="15" fill="#FFFFFF" />
        <circle cx="266" cy="41" r="4" fill="#10B981" />
        <text x="278" y="45" fill="#1E293B" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">
          Dream Job
        </text>
      </g>

      {/* Floating 3D Briefcase */}
      <g filter="url(#shadowFilter)">
        <rect x="270" y="70" width="46" height="34" rx="8" fill="url(#briefcaseGrad)" />
        <rect x="284" y="64" width="18" height="8" rx="3" fill="none" stroke="#0284C7" strokeWidth="2.5" />
        <path d="M270 84 H316" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 2" opacity="0.6" />
        <rect x="290" y="81" width="6" height="6" rx="1.5" fill="#F8FAFC" />
      </g>

      {/* Desk Surface */}
      <rect x="110" y="182" width="220" height="7" rx="3.5" fill="#E2E8F0" />

      {/* Developer Character */}
      {/* Body / Blue Hoodie */}
      <path
        d="M178 140 C178 126, 192 114, 212 114 C232 114, 246 126, 246 140 L254 184 L170 184 Z"
        fill="url(#hoodieGrad)"
      />
      {/* Hoodie Collar V */}
      <path d="M204 115 L212 128 L220 115" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

      {/* Neck */}
      <rect x="207" y="103" width="10" height="14" rx="3" fill="#FBCFE8" />

      {/* Head */}
      <ellipse cx="212" cy="92" rx="14" ry="16" fill="#FDE047" opacity="0" />
      <path
        d="M198 92 C198 81, 204 74, 212 74 C220 74, 226 81, 226 92 C226 102, 220 108, 212 108 C204 108, 198 102, 198 92 Z"
        fill="#FBD38D"
      />

      {/* Hair (Modern short dark hair) */}
      <path
        d="M196 90 C196 74, 204 66, 214 66 C224 66, 228 72, 228 82 C228 85, 226 86, 223 83 C220 79, 215 78, 211 81 C207 84, 203 85, 200 89 Z"
        fill="#1E293B"
      />

      {/* Facial Features */}
      <circle cx="206" cy="90" r="1.5" fill="#1E293B" />
      <circle cx="216" cy="90" r="1.5" fill="#1E293B" />
      {/* Smile */}
      <path d="M208 97 C210 100, 214 100, 216 97" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" />

      {/* Arms & Hands typing */}
      <path d="M180 148 L160 174 L190 174" stroke="url(#hoodieGrad)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="190" cy="174" r="5" fill="#FBD38D" />

      {/* Laptop */}
      {/* Laptop Screen Open */}
      <path d="M142 136 L184 136 L178 174 L136 174 Z" fill="url(#laptopGrad)" />
      <path d="M145 139 L181 139 L176 171 L140 171 Z" fill="url(#screenGrad)" />
      {/* Mini code lines on screen */}
      <line x1="146" y1="146" x2="164" y2="146" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="148" y1="152" x2="172" y2="152" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
      <line x1="148" y1="158" x2="162" y2="158" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      {/* Apple / Logo dot on back of lid */}
      <circle cx="160" cy="154" r="2" fill="#FFFFFF" opacity="0.7" />
      {/* Laptop Base */}
      <path d="M128 174 L186 174 L182 178 L124 178 Z" fill="#64748B" />

      {/* Decorative Sparkles & Waves */}
      <path d="M90 60 L93 67 L100 70 L93 73 L90 80 L87 73 L80 70 L87 67 Z" fill="#60A5FA" opacity="0.6" />
      <circle cx="130" cy="45" r="3" fill="#38BDF8" opacity="0.5" />
      <circle cx="330" cy="150" r="4" fill="#60A5FA" opacity="0.4" />
    </svg>
  );
}

/**
 * 3D Style Rocket Graphic for Sidebar Promo Card
 */
export function RocketIllustration({ className = 'w-20 h-20' }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="rocketWing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>

      {/* Floating Sparkles & Clouds */}
      <circle cx="24" cy="30" r="2.5" fill="#93C5FD" opacity="0.7" />
      <circle cx="95" cy="40" r="3" fill="#60A5FA" opacity="0.6" />
      <circle cx="86" cy="88" r="2" fill="#FBBF24" opacity="0.8" />
      <path d="M18 78 L20 83 L25 85 L20 87 L18 92 L16 87 L11 85 L16 83 Z" fill="#FCD34D" opacity="0.7" />

      {/* Rocket Main Group tilted 45 deg */}
      <g transform="translate(60, 58) rotate(45) translate(-60, -58)">
        {/* Exhaust Flame */}
        <path
          d="M55 78 C52 92, 57 106, 60 114 C63 106, 68 92, 65 78 Z"
          fill="url(#flameGrad)"
        />
        <path
          d="M57 78 C55 86, 58 96, 60 102 C62 96, 65 86, 63 78 Z"
          fill="#FEF08A"
        />

        {/* Left Fin */}
        <path
          d="M45 62 C34 66, 32 80, 36 84 C42 84, 48 78, 50 72 Z"
          fill="url(#rocketWing)"
        />
        {/* Right Fin */}
        <path
          d="M75 62 C86 66, 88 80, 84 84 C78 84, 72 78, 70 72 Z"
          fill="url(#rocketWing)"
        />

        {/* Rocket Body */}
        <path
          d="M60 14 C48 30, 46 62, 48 78 C54 81, 66 81, 72 78 C74 62, 72 30, 60 14 Z"
          fill="url(#rocketBody)"
        />

        {/* Rocket Nose Cone */}
        <path
          d="M60 14 C54 22, 51 32, 50 40 C56 42, 64 42, 70 40 C69 32, 66 22, 60 14 Z"
          fill="#38BDF8"
        />

        {/* Rocket Center Window */}
        <circle cx="60" cy="52" r="7" fill="#E0F2FE" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="58" cy="50" r="2.5" fill="#FFFFFF" />

        {/* Center Stripe */}
        <rect x="58" y="66" width="4" height="8" rx="2" fill="#F8FAFC" opacity="0.8" />
      </g>
    </svg>
  );
}

/**
 * Modern Empty State Illustration: Magnifier over search document with floating paper plane & stars
 */
export function EmptySearchIllustration({ className = 'w-48 h-40' }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
        <linearGradient id="magGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="emptyShadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Background Soft Circle */}
      <circle cx="120" cy="90" r="75" fill="#F0F7FF" />
      <circle cx="120" cy="90" r="55" fill="#E0F0FE" opacity="0.6" />

      {/* Floating Sparkles & Dots */}
      <path d="M45 45 L48 51 L54 53 L48 55 L45 61 L42 55 L36 53 L42 51 Z" fill="#60A5FA" opacity="0.8" />
      <path d="M190 120 L192 125 L197 127 L192 129 L190 134 L188 129 L183 127 L188 125 Z" fill="#38BDF8" opacity="0.7" />
      <circle cx="50" cy="115" r="3" fill="#93C5FD" />
      <circle cx="180" cy="40" r="2.5" fill="#60A5FA" />

      {/* Paper Plane in Top-Right */}
      <g transform="translate(170, 48) rotate(15)">
        <path d="M0 10 L26 0 L14 24 L10 14 Z" fill="url(#planeGrad)" />
        <path d="M10 14 L26 0 L14 24 Z" fill="#1E40AF" opacity="0.3" />
        {/* Dash Trail */}
        <path d="M-14 20 Q -4 18 0 10" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="2 3" fill="none" />
      </g>

      {/* Document / Card in Center */}
      <g filter="url(#emptyShadow)">
        <rect x="70" y="44" width="95" height="78" rx="14" fill="url(#docGrad)" stroke="#E2E8F0" strokeWidth="2" />
        {/* Card Header bar */}
        <rect x="80" y="56" width="34" height="6" rx="3" fill="#2563EB" />
        {/* Document lines */}
        <rect x="80" y="70" width="60" height="5" rx="2.5" fill="#CBD5E1" />
        <rect x="80" y="80" width="75" height="5" rx="2.5" fill="#E2E8F0" />
        <rect x="80" y="90" width="45" height="5" rx="2.5" fill="#E2E8F0" />
        <rect x="80" y="100" width="55" height="5" rx="2.5" fill="#E2E8F0" />
      </g>

      {/* Big Crisp Magnifying Glass over Document */}
      <g filter="url(#emptyShadow)">
        {/* Lens Rim */}
        <circle cx="140" cy="100" r="26" fill="#FFFFFF" stroke="url(#magGlassGrad)" strokeWidth="6" />
        {/* Lens Gloss & Sparkle */}
        <path
          d="M124 92 C128 84, 138 80, 146 82"
          stroke="#93C5FD"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Magnifier Handle */}
        <path
          d="M158 118 L180 140"
          stroke="url(#magGlassGrad)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Inner Mini Plus or Query Dot */}
        <circle cx="140" cy="100" r="4" fill="#2563EB" opacity="0.8" />
      </g>
    </svg>
  );
}

/**
 * Mini Sparkline Bar Chart for the Total Active Jobs card
 */
export function SparklineBars({ className = 'w-6 h-4' }) {
  return (
    <svg viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="10" width="3" height="6" rx="1" fill="#93C5FD" />
      <rect x="7" y="7" width="3" height="9" rx="1" fill="#60A5FA" />
      <rect x="12" y="4" width="3" height="12" rx="1" fill="#3B82F6" />
      <rect x="17" y="1" width="3" height="15" rx="1" fill="#1D4ED8" />
    </svg>
  );
}

