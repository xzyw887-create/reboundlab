import Image from "next/image";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<LogoSize, number> = {
  xs: 36,
  sm: 40,
  md: 44,
  lg: 52,
  xl: 64,
};

interface Props {
  size?: LogoSize;
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({ size = "md", className = "", decorative = false }: Props) {
  const px = SIZE_PX[size];

  return (
    <Image
      src="/brand/logo.png"
      alt={decorative ? "" : "BackTest Pro"}
      width={px}
      height={px}
      className={`rounded-xl shrink-0 ${className}`}
      aria-hidden={decorative || undefined}
      priority={size === "lg" || size === "xl"}
    />
  );
}
