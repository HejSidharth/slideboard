"use client";

export function BooksIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stack of books */}
      {/* Bottom book */}
      <rect x="30" y="100" width="100" height="25" rx="3" fill="#9CAF88" />
      <rect x="35" y="105" width="20" height="3" rx="1.5" fill="#D4E4D1" />
      
      {/* Middle book */}
      <rect x="35" y="75" width="90" height="25" rx="3" fill="#E6D5F5" />
      <rect x="40" y="80" width="18" height="3" rx="1.5" fill="#F5F0FF" />
      
      {/* Top book */}
      <rect x="40" y="50" width="80" height="25" rx="3" fill="#FFD4C4" />
      <rect x="45" y="55" width="16" height="3" rx="1.5" fill="#FFE8E0" />
      
      {/* Bookmark */}
      <path
        d="M110 50V70L115 65L120 70V50"
        fill="#E57373"
      />
      
      {/* Floating sparkles */}
      <circle cx="25" cy="60" r="4" fill="#D4E4D1" />
      <circle cx="135" cy="85" r="5" fill="#FFD4C4" />
      <circle cx="30" cy="95" r="3" fill="#E6D5F5" />
      
      {/* Plant leaf */}
      <path
        d="M130 120C130 120 140 110 140 100C140 95 135 90 130 90C125 90 120 95 120 100C120 110 130 120 130 120Z"
        fill="#9CAF88"
      />
      <path
        d="M130 120V135"
        stroke="#7A8F6A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
