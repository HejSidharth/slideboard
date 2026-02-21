"use client";

export function OrganicBlob({ className, color = "sage" }: { className?: string; color?: "sage" | "lavender" | "peach" | "cream" }) {
  const colors = {
    sage: "#D4E4D1",
    lavender: "#F5F0FF",
    peach: "#FFE8E0",
    cream: "#FFF9F5"
  };

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M45.7,-76.3C58.9,-69.3,69.1,-56.3,76.3,-42.3C83.5,-28.3,87.6,-13.3,86.7,1.2C85.8,15.7,79.9,29.7,71.3,41.7C62.7,53.7,51.4,63.7,38.7,70.3C26,76.9,12,80.1,-1.3,82.2C-14.6,84.3,-27.9,85.3,-40.1,80.1C-52.3,74.9,-63.4,63.5,-71.3,50.3C-79.2,37.1,-83.9,22.1,-84.3,6.9C-84.7,-8.3,-80.8,-23.7,-73.3,-37.3C-65.8,-50.9,-54.7,-62.7,-41.9,-69.9C-29.1,-77.1,-14.6,-79.7,0.4,-80.4C15.4,-81.1,30.8,-80,45.7,-76.3Z"
        fill={colors[color]}
        transform="translate(100 100)"
      />
    </svg>
  );
}
