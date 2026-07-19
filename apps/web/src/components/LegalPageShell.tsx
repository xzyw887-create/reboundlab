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
      <SiteHeader variant="minimal" />
      <main className="flex-1 landing-container py-10 sm:py-14 max-w-3xl">
        <header className="mb-8 space-y-2">
          <p className="label-caps text-accent">BackTest Pro</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </header>
        <div className="prose-site space-y-4 text-sm text-gray-300 leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
