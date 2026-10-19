"use client";

import { AppLink } from "@/components/AppLink";
import { useAuthSession } from "@/lib/useAuthSession";
import { useLocale } from "@/lib/i18n";
import { hasLiveAccess } from "@/lib/postLoginPath";

export function LandingHeroCta() {
  const { t } = useLocale();
  const { loading, user } = useAuthSession();

  const href =
    !loading && user ? (hasLiveAccess(user) ? "/app" : "/pricing") : "/login?next=/app";

  return (
    <AppLink href={href} className="landing-hero-cta">
      {t.landing.ctaCalculator}
      <span aria-hidden>→</span>
    </AppLink>
  );
}
