"use client";

import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14 w-full">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
