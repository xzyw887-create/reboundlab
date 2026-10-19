"use client";

import { AppLink } from "@/components/AppLink";
import { useAuthSession } from "@/lib/useAuthSession";
import { useLocale } from "@/lib/i18n";

export function LandingHeroCta() {
  const { t } = useLocale();
  const { loading, isGuest, user } = useAuthSession();

  if (loading) {
    return <div className="h-12" aria-hidden />;
  }

  const live =
    Boolean(user?.paymentMethodBound) &&
    !user?.trialExpired &&
    !user?.subscriptionExpired;

  const href = isGuest ? "/login?next=/app" : live ? "/app" : "/pricing";

  return (
    <AppLink href={href} className="landing-hero-cta">
      {t.landing.ctaCalculator}
      <span aria-hidden>→</span>
    </AppLink>
  );
}
