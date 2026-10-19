"use client";

import { Suspense } from "react";
import { PricingWithCheckout } from "@/components/PricingWithCheckout";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/lib/i18n";

function PricingContent() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-[88rem] mx-auto px-4 py-7 sm:py-9 space-y-8 w-full">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="page-kicker">{t.nav.pricing}</h1>
        </section>

        <PricingWithCheckout />
      </main>

      <SiteFooter />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted py-20">…</p>}>
      <PricingContent />
    </Suspense>
  );
}
