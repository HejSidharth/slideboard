"use client";

export function TeacherIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background blob */}
      <path
        d="M40 100C40 66.8629 66.8629 40 100 40C133.137 40 160 66.8629 160 100C160 133.137 133.137 160 100 160C66.8629 160 40 133.137 40 100Z"
        fill="#F5F0FF"
      />
      
      {/* Head */}
      <circle cx="100" cy="80" r="25" fill="#FFE8E0" />
      
      {/* Hair */}
      <path
        d="M75 75C75 61.1929 86.1929 50 100 50C113.807 50 125 61.1929 125 75C125 80 123 85 120 88L115 85C118 82 119 78 119 75C119 64.5066 110.493 56 100 56C89.5066 56 81 64.5066 81 75C81 78 82 82 85 85L80 88C77 85 75 80 75 75Z"
        fill="#2D2A26"
      />
      
      {/* Eyes */}
      <circle cx="92" cy="78" r="3" fill="#2D2A26" />
      <circle cx="108" cy="78" r="3" fill="#2D2A26" />
      
      {/* Smile */}
      <path
        d="M94 88C94 88 97 92 100 92C103 92 106 88 106 88"
        stroke="#2D2A26"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Body */}
      <path
        d="M75 110C75 110 70 140 70 160H130C130 140 125 110 125 110C125 110 115 105 100 105C85 105 75 110 75 110Z"
        fill="#9CAF88"
      />
      
      {/* Arms */}
      <path
        d="M75 120C65 130 60 145 65 155"
        stroke="#FFE8E0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M125 120C135 130 140 145 135 155"
        stroke="#FFE8E0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Book */}
      <rect x="85" y="140" width="30" height="25" rx="2" fill="#FFD4C4" />
      <path
        d="M85 152.5H115"
        stroke="#E6D5F5"
        strokeWidth="2"
      />
      
      {/* Plant decoration */}
      <circle cx="150" cy="140" r="15" fill="#D4E4D1" />
      <path
        d="M150 140V125M150 132L143 128M150 132L157 128"
        stroke="#9CAF88"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
