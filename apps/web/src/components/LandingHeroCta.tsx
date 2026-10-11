"use client";

import Link from "next/link";
import { AppLink } from "@/components/AppLink";
import { useAuthSession } from "@/lib/useAuthSession";
import { planDisplayName } from "@/lib/selectedPlan";
import { formatTpl, useLocale } from "@/lib/i18n";

export function LandingHeroCta() {
  const { t } = useLocale();
  const { loading, isGuest, isPaid, isTrialActive, isTrialExpired, user } =
    useAuthSession();

  if (loading) {
    return <div className="h-10" aria-hidden />;
  }

  if (isGuest) {
    return (
      <>
        <div className="flex flex-wrap gap-3">
          <AppLink href="/register?next=/app" className="btn-primary px-6">
            {t.landing.ctaTrial}
          </AppLink>
        </div>
        <p className="text-xs text-muted">{t.landing.trialNote}</p>
      </>
    );
  }

  if (isTrialExpired) {
    return (
      <>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-primary px-6">
            {t.landing.ctaChoosePlan}
          </Link>
        </div>
        <p className="text-xs text-muted">{t.landing.trialEndedNote}</p>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <AppLink href="/app" className="btn-primary px-6">
          {t.landing.ctaCalculator}
        </AppLink>
        {isPaid && (
          <Link href="/account" className="landing-btn-outline px-6">
            {t.nav.account}
          </Link>
        )}
      </div>
      <p className="text-xs text-muted">
        {isPaid && user
          ? formatTpl(t.landing.planActive, {
              plan: planDisplayName(user.planTier),
            })
          : isTrialActive && user?.expiresAt
          ? formatTpl(t.landing.trialActiveUntil, {
              date: user.expiresAt.slice(0, 10),
            })
          : t.landing.trialActiveNote}
      </p>
    </>
  );
}
