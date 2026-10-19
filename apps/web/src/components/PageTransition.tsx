"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function shouldAnimateRoute(pathname: string): boolean {
  if (pathname.startsWith("/app")) return false;
  return true;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!shouldAnimateRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} className="page-route-enter">
      {children}
    </div>
  );
}
