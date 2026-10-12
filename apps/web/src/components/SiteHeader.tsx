"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  const siteMenuLinks = [
    { href: "/how-it-works", label: t.nav.howItWorks },
    { href: "/#features", label: t.nav.product },
    { href: "/pricing", label: t.nav.pricing },
    { href: "/help", label: t.nav.help },
  ] as const;

  return (
    <>
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
          <div className="site-brand-dropdown-wrap max-md:contents">
            <Link href="/" className="site-brand group min-w-0" onClick={closeMobile}>
              <BrandLogo size="md" decorative />
              <div className="min-w-0">
                <p className="site-brand-name truncate">{t.brand.name}</p>
              </div>
              <span className="site-brand-chevron hidden md:inline-flex" aria-hidden>
                <svg viewBox="0 0 16 16" className="site-brand-chevron-icon" fill="currentColor">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
            <div className="site-brand-dropdown hidden md:block" role="navigation" aria-label={t.brand.name}>
              <div className="site-brand-dropdown-panel">
                {siteMenuLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="site-brand-dropdown-link"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <nav className="site-nav hidden md:flex">
          <AppLink href="/app" className="site-nav-terminal-cta inline-flex shrink-0">
            {t.landing.ctaCalculator}
          </AppLink>
          <LanguageSwitcher />
          {!loading && isGuest && (
            <AppLink href="/login?next=/app" className="btn-primary site-cta-sm">
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

        <div className="flex items-center gap-1.5 sm:gap-2 md:hidden shrink-0 min-w-0">
          <AppLink
            href="/app"
            className="site-nav-terminal-cta inline-flex shrink-0 text-[11px] px-2.5 py-1.5"
          >
            {t.landing.ctaCalculator}
          </AppLink>
          <LanguageSwitcher />
          {!loading && user && (
            <Link
              href="/account"
              className="pill-tag text-[10px] hover:border-accent/50 transition-colors"
              title={t.nav.account}
            >
              {planDisplayName(user.planTier)}
            </Link>
          )}
          {!loading && isGuest && (
            <AppLink href="/login?next=/app" className="btn-primary site-cta-sm text-xs">
              {t.nav.login}
            </AppLink>
          )}
        </div>
      </div>
    </header>

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
            <nav className="flex flex-col gap-1">
              {siteMenuLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="site-nav-link"
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))}
              <AppLink href="/app" className="site-nav-terminal-cta mt-2" onClick={closeMobile}>
                {t.landing.ctaCalculator}
              </AppLink>
            </nav>
            <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
              {!loading && isGuest && (
                <AppLink
                  href="/login?next=/app"
                  className="btn-primary w-full text-center block py-2.5"
                  onClick={closeMobile}
                >
                  {t.nav.login}
                </AppLink>
              )}
              {!loading && user && (
                <>
                  <Link
                    href="/account"
                    className="pill-tag text-[10px] inline-flex w-fit mb-2"
                    onClick={closeMobile}
                  >
                    {planDisplayName(user.planTier)}
                  </Link>
                  {isTrialExpired && (
                    <Link
                      href="/pricing"
                      className="btn-primary w-full text-center block py-2.5"
                      onClick={closeMobile}
                    >
                      {t.landing.ctaChoosePlan}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
