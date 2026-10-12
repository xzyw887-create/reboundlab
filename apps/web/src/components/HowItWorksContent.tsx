"use client";

import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { AppLink } from "@/components/AppLink";
import { useAuthSession } from "@/lib/useAuthSession";
import { useLocale } from "@/lib/i18n";

export function HowItWorksContent() {
  const { t } = useLocale();
  const { isGuest, isTrialExpired } = useAuthSession();

  return (
    <LegalPageShell title={t.howItWorks.title} subtitle={t.howItWorks.subtitle}>
      <p>{t.howItWorks.intro}</p>

      <div className="grid gap-4 mt-6 not-prose">
        {t.howItWorks.steps.map((s) => (
          <div key={s.n} className="landing-step">
            <span className="landing-step-num">{s.n}</span>
            <h2 className="text-lg font-semibold text-white mt-2">{s.title}</h2>
            <p className="text-sm text-muted mt-1">{s.text}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-white mt-10">{t.howItWorks.feesTitle}</h2>
      <p className="text-sm text-muted">{t.howItWorks.feesIntro}</p>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300 mt-3">
        {t.howItWorks.fees.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <h2 className="text-lg font-semibold text-white mt-8">{t.howItWorks.dataTitle}</h2>
      <p className="text-sm text-muted">{t.howItWorks.dataText}</p>

      <div className="flex flex-wrap gap-3 mt-8 not-prose">
        {isGuest && (
          <>
            <Link href="/login?next=/app" className="btn-primary px-5 py-2.5 text-sm">
              {t.howItWorks.ctaTrial}
            </Link>
          </>
        )}
        {!isGuest && !isTrialExpired && (
          <AppLink href="/app" className="btn-primary px-5 py-2.5 text-sm">
            {t.landing.ctaCalculator}
          </AppLink>
        )}
        {!isGuest && isTrialExpired && (
          <Link href="/pricing" className="btn-primary px-5 py-2.5 text-sm">
            {t.landing.ctaChoosePlan}
          </Link>
        )}
        <Link href="/pricing" className="landing-btn-outline px-5 py-2.5 text-sm">
          {t.howItWorks.ctaPricing}
        </Link>
      </div>
    </LegalPageShell>
  );
}
