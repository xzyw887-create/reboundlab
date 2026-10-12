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

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-14 w-full">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="label-caps text-muted">{t.nav.pricing}</h1>
        </section>

        <PricingWithCheckout />

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white text-center">{t.pricing.faqTitle}</h2>
          <div className="grid gap-3 max-w-2xl mx-auto">
            {t.pricing.faq.map((item) => (
              <details key={item.q} className="card-pro px-4 py-3 group">
                <summary className="cursor-pointer text-sm font-medium text-gray-200 list-none flex justify-between gap-2">
                  {item.q}
                  <span className="text-muted group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted mt-3 pb-1">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
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
