"use client";

import Link from "next/link";
import { SupportContacts } from "@/components/SupportContacts";
import { formatTpl, useLocale } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLocale();
  const year = String(new Date().getFullYear());

  return (
    <footer className="site-footer">
      <div className="site-footer-contacts">
        <SupportContacts />
      </div>
      <div className="site-footer-bar">
        <p className="site-footer-disclaimer">{t.footer.disclaimerShort}</p>
        <p className="site-footer-copy">
          {formatTpl(t.footer.copyright, { year, name: t.brand.name })}
        </p>
        <nav className="site-footer-legal" aria-label={t.footer.legal}>
          <Link href="/privacy">{t.footer.privacy}</Link>
          <Link href="/terms">{t.footer.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
