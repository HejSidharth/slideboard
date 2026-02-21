"use client";

export function AIBotIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background blob */}
      <path
        d="M30 100C30 61.3401 61.3401 30 100 30C138.66 30 170 61.3401 170 100C170 138.66 138.66 170 100 170C61.3401 170 30 138.66 30 100Z"
        fill="#FFE8E0"
      />
      
      {/* Robot head */}
      <rect x="55" y="60" width="90" height="70" rx="15" fill="#FFFFFF" stroke="#E8E4E0" strokeWidth="2" />
      
      {/* Antenna */}
      <path
        d="M100 60V45"
        stroke="#6B6560"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="40" r="6" fill="#FFD4C4" />
      
      {/* Eyes */}
      <circle cx="80" cy="90" r="10" fill="#E6D5F5" />
      <circle cx="80" cy="90" r="6" fill="#2D2A26" />
      <circle cx="120" cy="90" r="10" fill="#E6D5F5" />
      <circle cx="120" cy="90" r="6" fill="#2D2A26" />
      
      {/* Smile */}
      <path
        d="M85 110C85 110 92 118 100 118C108 118 115 110 115 110"
        stroke="#2D2A26"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Body */}
      <path
        d="M65 130C65 130 60 160 60 180H140C140 160 135 130 135 130"
        fill="#9CAF88"
      />
      
      {/* Screen on body */}
      <rect x="80" y="145" width="40" height="25" rx="4" fill="#D4E4D1" />
      <rect x="85" y="152" width="20" height="3" rx="1.5" fill="#9CAF88" />
      <rect x="85" y="158" width="30" height="3" rx="1.5" fill="#9CAF88" />
      
      {/* Arms */}
      <path
        d="M55 100C40 110 35 130 40 145"
        stroke="#6B6560"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M145 100C160 110 165 130 160 145"
        stroke="#6B6560"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* Floating elements */}
      <circle cx="35" cy="85" r="5" fill="#D4E4D1" />
      <circle cx="155" cy="120" r="4" fill="#E6D5F5" />
    </svg>
  );
}
