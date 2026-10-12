"use client";

import { TerminalPreview } from "@/components/TerminalPreview";
import { ProductShowcase } from "@/components/ProductShowcase";
import { LandingHeroCta } from "@/components/LandingHeroCta";
import { LandingMarketStats } from "@/components/LandingMarketStats";
import type { MarketLandingStats } from "@/lib/marketLandingStatsFormat";
import { useLocale } from "@/lib/i18n";

type Props = {
  marketStats?: MarketLandingStats | null;
};

export function LandingContent({ marketStats = null }: Props) {
  const { t } = useLocale();

  return (
    <main className="flex-1">
      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-container landing-hero-grid">
          <div className="space-y-6">
            <p className="label-caps">{t.landing.heroLabel}</p>
            <h1 className="landing-title">
              {t.landing.heroTitle}
              <span className="landing-title-accent">{t.landing.heroTitleAccent}</span>
            </h1>
            <p className="landing-lead">{t.landing.heroLead}</p>
            <div className="landing-why">
              <p className="text-sm text-gray-300 leading-relaxed">{t.landing.whyLead}</p>
              <ul className="mt-3 space-y-2">
                {t.landing.whyBullets.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-muted leading-snug">
                    <span className="text-muted shrink-0 font-mono text-xs" aria-hidden>
                      —
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted/90 mt-3 leading-relaxed">{t.landing.whyDisclaimer}</p>
            </div>
            <LandingHeroCta />
          </div>

          <TerminalPreview />
        </div>

        <div className="landing-container mt-10 pb-4">
          <LandingMarketStats initialStats={marketStats} />
        </div>
      </section>

      <ProductShowcase />
    </main>
  );
}
