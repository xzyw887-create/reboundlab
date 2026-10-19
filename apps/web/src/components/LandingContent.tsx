"use client";

import { ProductShowcase } from "@/components/ProductShowcase";
import { LandingHeroCta } from "@/components/LandingHeroCta";
import { LandingMarketStats } from "@/components/LandingMarketStats";
import { useLocale } from "@/lib/i18n";

export function LandingContent() {
  const { t } = useLocale();

  return (
    <main className="flex-1">
      <section id="home" className="landing-hero scroll-mt-24">
        <div className="landing-hero-overlay" aria-hidden />
        <div className="landing-container landing-hero-frame">
          <div className="landing-hero-copy">
            <h1 className="landing-title">
              <span className="landing-title-line">{t.landing.heroTitle}</span>
              <span className="landing-title-accent">{t.landing.heroTitleAccent}</span>
            </h1>
            <p className="landing-lead">{t.landing.heroLead}</p>
            <LandingHeroCta />
          </div>
          <LandingMarketStats />
        </div>
      </section>

      <ProductShowcase />
    </main>
  );
}
