"use client";

import Link from "next/link";
import { PricingWithCheckout } from "@/components/PricingWithCheckout";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuthSession } from "@/lib/useAuthSession";
import { planDisplayName } from "@/lib/selectedPlan";
import { formatTpl, useLocale } from "@/lib/i18n";

export default function PricingPage() {
  const { t } = useLocale();
  const { isGuest, isPaid, isTrialExpired, user } = useAuthSession();

  const subtitle = isGuest
    ? t.pricing.subtitle
    : isPaid && user
    ? formatTpl(t.pricing.subtitlePaid, { plan: planDisplayName(user.planTier) })
    : isTrialExpired
    ? t.pricing.subtitleExpired
    : t.pricing.subtitleTrial;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-14 w-full">
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <p className="label-caps text-accent">{t.pricing.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            {t.pricing.title}
          </h1>
          <p className="text-muted text-base sm:text-lg">{subtitle}</p>
          {!isGuest && !isTrialExpired && (
            <Link href="/app" className="text-sm text-accent hover:text-accent/80">
              {t.landing.ctaCalculator} →
            </Link>
          )}
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
