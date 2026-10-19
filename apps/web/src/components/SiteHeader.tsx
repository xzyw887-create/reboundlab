"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AppLink } from "@/components/AppLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthSession } from "@/lib/useAuthSession";
import { planDisplayName } from "@/lib/selectedPlan";
import { useLocale } from "@/lib/i18n";

interface Props {
  /** @deprecated Все публичные страницы показывают одно меню; prop игнорируется. */
  variant?: "landing" | "minimal";
}

export function SiteHeader(_props?: Props) {
  const { t } = useLocale();
  const { user, loading, isGuest, isTrialExpired } = useAuthSession();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand min-w-0">
          <BrandLogo size="md" decorative />
          <p className="site-brand-name truncate">{t.brand.name}</p>
        </Link>

        <nav className="site-nav ml-auto">
          <LanguageSwitcher />
          <span className="site-header-rule" aria-hidden />
          {!loading && isGuest && (
            <AppLink href="/login?next=/app" className="site-login-btn">
              {t.nav.login}
            </AppLink>
          )}
          {!loading && user && (
            <>
              <Link
                href="/account"
                className="pill-tag text-[10px] hover:border-accent/50 transition-colors"
                title={t.nav.account}
              >
                {planDisplayName(user.planTier)}
              </Link>
              {isTrialExpired && (
                <Link href="/pricing" className="btn-primary site-cta-sm">
                  {t.landing.ctaChoosePlan}
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
