"use client";

import { useId } from "react";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<LogoSize, number> = {
  xs: 34,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 84,
};

const VB_W = 120;
const VB_H = 82;

interface Props {
  size?: LogoSize;
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({ size = "md", className = "", decorative = false }: Props) {
  const px = SIZE_PX[size];
  const height = Math.round((px * VB_H) / VB_W);
  const id = useId().replace(/:/g, "");

  return (
    <svg
      width={px}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      fill="none"
      className={`shrink-0 ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "BackTest Pro"}
    >
      <defs>
        <linearGradient id={`${id}-top`} x1="25" y1="4" x2="95" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0fdff" />
          <stop offset="0.45" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={`${id}-cap-l`} x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#155e75" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id={`${id}-cap-r`} x1="92" y1="6" x2="116" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={`${id}-leg-l-out`} x1="4" y1="22" x2="40" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id={`${id}-leg-l-in`} x1="26" y1="24" x2="57" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id={`${id}-leg-r-out`} x1="116" y1="21" x2="70" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${id}-leg-r-in`} x1="94" y1="24" x2="62" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e0fbff" />
          <stop offset="0.4" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <polygon points="4.2,21.3 15.2,22.4 57.4,77.6" fill={`url(#${id}-leg-l-out)`} />
      <polygon points="15.2,22.4 26.2,23.5 57.4,77.6" fill={`url(#${id}-leg-l-in)`} />
      <polygon points="115.8,21.3 104.8,22.4 61.9,77.6" fill={`url(#${id}-leg-r-out)`} />
      <polygon points="104.8,22.4 93.8,23.5 61.9,77.6" fill={`url(#${id}-leg-r-in)`} />
      <polygon points="25.3,4.2 27.7,14.3 26.2,23.5 4.2,21.3" fill={`url(#${id}-cap-l)`} />
      <polygon points="94.9,4.2 115.8,21.3 93.8,23.5 92.1,14.3" fill={`url(#${id}-cap-r)`} />
      <polygon points="25.3,4.2 94.9,4.2 92.1,14.3 27.7,14.3" fill={`url(#${id}-top)`} />
      <path
        d="M27.7 14.3 L26.2 23.5 L57.4 77.6 M92.1 14.3 L93.8 23.5 L61.9 77.6 M25.3 4.2 L94.9 4.2"
        stroke="#f0fdff"
        strokeOpacity="0.72"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
