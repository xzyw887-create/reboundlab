"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AppLink } from "@/components/AppLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthSession } from "@/lib/useAuthSession";
import { planDisplayName } from "@/lib/selectedPlan";
import { useLocale } from "@/lib/i18n";
import { userDisplayLabel } from "@/lib/userDisplayName";

interface Props {
  /** @deprecated Все публичные страницы показывают одно меню; prop игнорируется. */
  variant?: "landing" | "minimal";
}

export function SiteHeader(_props?: Props) {
  const { t } = useLocale();
  const { user, loading, isGuest, isPaid, isTrialExpired } = useAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const userLabel = user
    ? userDisplayLabel(user, t.accountPage.loginViaTelegram)
    : "";

  const navLinks = (
    <>
      <Link href="/how-it-works" className="site-nav-link" onClick={closeMobile}>
        {t.nav.howItWorks}
      </Link>
      <Link href="/#features" className="site-nav-link" onClick={closeMobile}>
        {t.nav.product}
      </Link>
      <Link href="/pricing" className="site-nav-link" onClick={closeMobile}>
        {t.nav.pricing}
      </Link>
      <Link href="/help" className="site-nav-link" onClick={closeMobile}>
        {t.nav.help}
      </Link>
      {isGuest && (
        <AppLink href="/app" className="site-nav-link" onClick={closeMobile}>
          {t.landing.ctaCalculator}
        </AppLink>
      )}
    </>
  );

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="site-menu-btn md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="site-menu-icon" aria-hidden />
          </button>
          <Link href="/" className="site-brand group min-w-0" onClick={closeMobile}>
            <BrandLogo size="md" decorative />
            <div className="min-w-0">
              <p className="title-gradient text-lg leading-tight truncate">{t.brand.name}</p>
            </div>
          </Link>
        </div>

        <nav className="site-nav hidden md:flex">
          <Link href="/how-it-works" className="site-nav-link hidden md:inline">
            {t.nav.howItWorks}
          </Link>
          <Link href="/#features" className="site-nav-link hidden md:inline">
            {t.nav.product}
          </Link>
          <Link href="/pricing" className="site-nav-link hidden md:inline">
            {t.nav.pricing}
          </Link>
          <Link href="/help" className="site-nav-link hidden md:inline">
            {t.nav.help}
          </Link>
          {isGuest && (
            <AppLink href="/app" className="site-nav-link hidden sm:inline">
              {t.landing.ctaCalculator}
            </AppLink>
          )}
          <LanguageSwitcher />
          {!loading && isGuest && (
            <>
              <AppLink href="/login?next=/app" className="site-nav-link">
                {t.nav.login}
              </AppLink>
              <AppLink href="/register?next=/app" className="btn-primary site-cta-sm">
                {t.nav.signup}
              </AppLink>
            </>
          )}
          {!loading && user && (
            <>
              {isPaid && (
                <span className="hidden sm:inline-flex pill-tag text-[10px]">
                  {planDisplayName(user.planTier)}
                </span>
              )}
              <Link
                href="/account"
                className="site-nav-link hidden sm:inline truncate max-w-[160px]"
              >
                {userLabel}
              </Link>
              {isTrialExpired ? (
                <Link href="/pricing" className="btn-primary site-cta-sm">
                  {t.landing.ctaChoosePlan}
                </Link>
              ) : (
                <Link href="/app" className="btn-primary site-cta-sm">
                  {t.landing.ctaCalculator}
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden shrink-0">
          <LanguageSwitcher />
          {!loading && isGuest && (
            <AppLink href="/register?next=/app" className="btn-primary site-cta-sm text-xs">
              {t.nav.signup}
            </AppLink>
          )}
          {!loading && user && (
            <Link href="/app" className="btn-primary site-cta-sm text-xs">
              {t.landing.ctaCalculator}
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="site-mobile-nav md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="site-mobile-backdrop"
            aria-label={t.nav.closeMenu}
            onClick={closeMobile}
          />
          <div className="site-mobile-panel">
            <div className="flex items-center justify-between mb-4">
              <p className="label-caps text-accent">{t.brand.name}</p>
              <button
                type="button"
                className="text-muted hover:text-white text-sm"
                onClick={closeMobile}
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1">{navLinks}</nav>
            <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
              {!loading && isGuest && (
                <>
                  <AppLink
                    href="/login?next=/app"
                    className="block text-center site-nav-link py-2"
                    onClick={closeMobile}
                  >
                    {t.nav.login}
                  </AppLink>
                  <AppLink
                    href="/register?next=/app"
                    className="btn-primary w-full text-center block py-2.5"
                    onClick={closeMobile}
                  >
                    {t.nav.signup}
                  </AppLink>
                </>
              )}
              {!loading && user && (
                <>
                  <Link
                    href="/account"
                    className="block text-sm text-muted truncate py-1"
                    onClick={closeMobile}
                  >
                    {userLabel}
                  </Link>
                  {isTrialExpired ? (
                    <Link
                      href="/pricing"
                      className="btn-primary w-full text-center block py-2.5"
                      onClick={closeMobile}
                    >
                      {t.landing.ctaChoosePlan}
                    </Link>
                  ) : (
                    <Link
                      href="/app"
                      className="btn-primary w-full text-center block py-2.5"
                      onClick={closeMobile}
                    >
                      {t.landing.ctaCalculator}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
