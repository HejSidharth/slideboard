"use client";

export function WhiteboardIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Whiteboard frame */}
      <rect x="20" y="20" width="160" height="100" rx="8" fill="#FFFFFF" stroke="#E8E4E0" strokeWidth="3" />
      
      {/* Board content - chart */}
      <path
        d="M40 80L70 60L100 70L130 45L160 55"
        stroke="#9CAF88"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Dots on chart */}
      <circle cx="70" cy="60" r="4" fill="#9CAF88" />
      <circle cx="100" cy="70" r="4" fill="#9CAF88" />
      <circle cx="130" cy="45" r="4" fill="#9CAF88" />
      
      {/* Some text lines */}
      <rect x="40" y="35" width="40" height="4" rx="2" fill="#E6D5F5" />
      <rect x="40" y="42" width="30" height="4" rx="2" fill="#E6D5F5" />
      
      {/* Stand legs */}
      <path
        d="M60 120L40 150M140 120L160 150"
        stroke="#6B6560"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Bottom bar */}
      <rect x="50" y="118" width="100" height="6" rx="3" fill="#6B6560" />
      
      {/* Floating elements */}
      <circle cx="30" cy="40" r="8" fill="#FFD4C4" opacity="0.6" />
      <circle cx="170" cy="90" r="6" fill="#D4E4D1" opacity="0.6" />
    </svg>
  );
}
