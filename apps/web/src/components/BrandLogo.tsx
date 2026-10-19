"use client";

import { useId } from "react";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<LogoSize, number> = {
  xs: 28,
  sm: 32,
  md: 38,
  lg: 48,
  xl: 60,
};

interface Props {
  size?: LogoSize;
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({ size = "md", className = "", decorative = false }: Props) {
  const px = SIZE_PX[size];
  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "BackTest Pro"}
    >
      <defs>
        <linearGradient id={`${gradId}-top`} x1="8" y1="6" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e0fbff" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <linearGradient id={`${gradId}-left`} x1="8" y1="16" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#155e75" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id={`${gradId}-right`} x1="24" y1="16" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <polygon points="24,5 42,15 24,25 6,15" fill={`url(#${gradId}-top)`} />
      <polygon points="6,15 24,25 24,43 6,33" fill={`url(#${gradId}-left)`} />
      <polygon points="24,25 42,15 42,33 24,43" fill={`url(#${gradId}-right)`} />
      <path d="M24 5 L42 15 L24 25 L6 15 Z" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
      <path d="M14 28.5 L20 25.5 L24 29 L30 22" stroke="#ecfeff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
