import React from "react";

export function LoomieLogoMark({ className = "w-12 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-colors duration-300`}
    >
      <rect
        x="1"
        y="1"
        width="68"
        height="34"
        rx="17"
        className="fill-foreground stroke-foreground"
        strokeWidth="2"
      />
      <circle cx="22" cy="18" r="9" className="fill-background" />
      <circle cx="48" cy="18" r="9" className="fill-background" />
    </svg>
  );
}
