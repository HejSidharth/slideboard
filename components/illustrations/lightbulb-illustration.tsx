"use client";

export function LightbulbIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Glow effect */}
      <circle cx="70" cy="70" r="55" fill="#FFF9E6" />
      
      {/* Lightbulb glass */}
      <path
        d="M70 20C45.1472 20 25 40.1472 25 65C25 82.5 35 97.5 50 106V125C50 128.314 52.6863 131 56 131H84C87.3137 131 90 128.314 90 125V106C105 97.5 115 82.5 115 65C115 40.1472 94.8528 20 70 20Z"
        fill="#FFE8B8"
        stroke="#FFD4A3"
        strokeWidth="2"
      />
      
      {/* Filament */}
      <path
        d="M55 55C55 55 58 75 70 75C82 75 85 55 85 55"
        stroke="#FFD4A3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Base */}
      <rect x="52" y="131" width="36" height="8" rx="2" fill="#C4B5A0" />
      <rect x="55" y="139" width="30" height="6" rx="2" fill="#B0A090" />
      <path
        d="M58 145H82V148C82 151.314 79.3137 154 76 154H64C60.6863 154 58 151.314 58 148V145Z"
        fill="#9B8F80"
      />
      
      {/* Shine lines */}
      <path
        d="M70 5V12M105 35L111 29M35 35L29 29"
        stroke="#FFD4C4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Sparkles */}
      <circle cx="25" cy="50" r="3" fill="#FFD4C4" />
      <circle cx="115" cy="45" r="4" fill="#E6D5F5" />
      <circle cx="100" cy="95" r="3" fill="#D4E4D1" />
    </svg>
  );
}
