import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function LegalPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 landing-container py-10 sm:py-14 max-w-3xl">
        <header className="mb-8 space-y-3">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-sm sm:text-base text-muted leading-relaxed">{subtitle}</p>}
        </header>
        <div className="prose-site space-y-4 text-sm text-gray-300 leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
