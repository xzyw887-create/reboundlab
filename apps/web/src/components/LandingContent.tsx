"use client";

import Link from "next/link";
import { TerminalPreview } from "@/components/TerminalPreview";
import { LandingHeroCta } from "@/components/LandingHeroCta";
import { LandingMarketStats } from "@/components/LandingMarketStats";
import type { MarketLandingStats } from "@/lib/marketLandingStatsFormat";
import { useAuthSession } from "@/lib/useAuthSession";
import { useLocale } from "@/lib/i18n";

type Props = {
  marketStats?: MarketLandingStats | null;
};

export function LandingContent({ marketStats = null }: Props) {
  const { t } = useLocale();
  const { isGuest, user } = useAuthSession();

  return (
    <main className="flex-1">
      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-container landing-hero-grid">
          <div className="space-y-6">
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
                    <span className="text-accent shrink-0" aria-hidden>
                      →
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

      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <p className="label-caps text-accent">{t.landing.featuresLabel}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.landing.featuresTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {t.landing.features.map((f, i) => (
              <article key={i} className="card-pro">
                <div className="card-pro-body space-y-3">
                  <span className="text-2xl" aria-hidden>
                    {["📈", "⚡", "🔐"][i]}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted">
        <div className="landing-container">
          <p className="label-caps text-accent text-center mb-8">{t.landing.stepsLabel}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {t.landing.steps.map((step) => (
              <div key={step.n} className="landing-step">
                <span className="landing-step-num">{step.n}</span>
                <h3 className="text-lg font-semibold text-white mt-3">{step.title}</h3>
                <p className="text-sm text-muted mt-2">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isGuest && (
      <section className="landing-section">
        <div className="landing-container max-w-2xl">
          <div className="card-pro">
            <div className="card-pro-body space-y-2">
              <p className="label-caps text-accent">{t.landing.trialFaqTitle}</p>
              <h3 className="text-lg font-semibold text-white">{t.trial.q}</h3>
              <p className="text-sm text-muted leading-relaxed">{t.trial.a}</p>
            </div>
          </div>
        </div>
      </section>
      )}

      <section id="pricing" className="landing-section">
        <div className="landing-container space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <p className="label-caps text-accent">{t.landing.pricingLabel}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.landing.pricingTitle}</h2>
            <p className="text-muted">
              {t.landing.pricingLead}
              {!isGuest && user && (
                <>
                  {" "}
                  <Link href="/account" className="text-accent hover:underline">
                    {t.nav.account}
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
          <div className="text-center">
            <Link href="/pricing" className="btn-primary inline-flex px-8 py-3">
              {t.landing.pricingTeaserCta}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
