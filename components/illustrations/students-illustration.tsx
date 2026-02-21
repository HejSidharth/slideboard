"use client";

export function StudentsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="240" height="160" rx="16" fill="#F5F0FF" />
      
      {/* Student 1 - left */}
      <circle cx="60" cy="60" r="20" fill="#FFE8E0" />
      {/* Hair */}
      <path
        d="M40 55C40 43.9543 48.9543 35 60 35C71.0457 35 80 43.9543 80 55"
        stroke="#2D2A26"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d="M40 85C40 85 35 110 35 130H85C85 110 80 85 80 85"
        fill="#FFD4C4"
      />
      {/* Smile */}
      <path
        d="M55 65C55 65 57 68 60 68C63 68 65 65 65 65"
        stroke="#2D2A26"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Student 2 - center */}
      <circle cx="120" cy="55" r="22" fill="#FFE8E0" />
      {/* Hair */}
      <path
        d="M98 50C98 37.8497 107.85 28 120 28C132.15 28 142 37.8497 142 50"
        stroke="#6B6560"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d="M95 80C95 80 88 108 88 130H152C152 108 145 80 145 80"
        fill="#9CAF88"
      />
      {/* Smile */}
      <path
        d="M115 60C115 60 117 64 120 64C123 64 125 60 125 60"
        stroke="#2D2A26"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Student 3 - right */}
      <circle cx="180" cy="60" r="20" fill="#FFE8E0" />
      {/* Hair */}
      <path
        d="M160 55C160 43.9543 168.954 35 180 35C191.046 35 200 43.9543 200 55"
        stroke="#2D2A26"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d="M160 85C160 85 155 110 155 130H205C205 110 200 85 200 85"
        fill="#E6D5F5"
      />
      {/* Smile */}
      <path
        d="M175 65C175 65 177 68 180 68C183 68 185 65 185 65"
        stroke="#2D2A26"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Decorative elements */}
      <circle cx="25" cy="45" r="6" fill="#FFD4C4" opacity="0.6" />
      <circle cx="215" cy="95" r="5" fill="#D4E4D1" opacity="0.6" />
      <circle cx="30" cy="115" r="4" fill="#E6D5F5" opacity="0.6" />
    </svg>
  );
}
