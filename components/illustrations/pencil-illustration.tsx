"use client";

export function PencilIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pencil body */}
      <rect x="45" y="40" width="30" height="80" rx="2" fill="#FFD4C4" />
      
      {/* Wood part */}
      <path
        d="M45 120L60 150L75 120"
        fill="#E8D5C4"
      />
      
      {/* Lead tip */}
      <path
        d="M52 142L60 155L68 142"
        fill="#2D2A26"
      />
      
      {/* Metal band */}
      <rect x="43" y="35" width="34" height="8" rx="2" fill="#C4B5A0" />
      
      {/* Eraser */}
      <rect x="45" y="15" width="30" height="22" rx="4" fill="#E6D5F5" />
      
      {/* Decorative lines on pencil */}
      <line x1="52" y1="50" x2="52" y2="110" stroke="#E8A890" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="50" x2="60" y2="110" stroke="#E8A890" strokeWidth="2" strokeLinecap="round" />
      <line x1="68" y1="50" x2="68" y2="110" stroke="#E8A890" strokeWidth="2" strokeLinecap="round" />
      
      {/* Floating sparkles */}
      <circle cx="20" cy="60" r="4" fill="#D4E4D1" />
      <circle cx="100" cy="90" r="5" fill="#FFD4C4" />
      <circle cx="25" cy="110" r="3" fill="#E6D5F5" />
    </svg>
  );
}
