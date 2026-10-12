"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LegalDocSections } from "@/components/LegalDocSections";
import { LegalPageShell } from "@/components/LegalPageShell";
import { LegalSellerRef } from "@/components/LegalSellerRef";
import { privacyPageCopy } from "@/lib/i18n/legalPrivacySections";
import { useLocale } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/supportContact";

export function PrivacyPageContent() {
  const { locale } = useLocale();
  const c = privacyPageCopy[locale];

  useEffect(() => {
    document.title = c.metaTitle;
  }, [c.metaTitle]);

  return (
    <LegalPageShell title={c.title} subtitle={c.subtitle}>
      <LegalDocSections sections={c.sections} />

      <h2 className="text-lg font-semibold text-white pt-6">{c.rightsHeading}</h2>
      <p>
        {c.rightsIntro}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
          {SUPPORT_EMAIL}
        </a>
        {c.rightsOrHelp}
        <Link href="/help" className="text-accent hover:underline">
          /help
        </Link>
        .
      </p>

      <LegalSellerRef text={c.sellerRefText} linkLabel={c.sellerRefLink} />

      <p className="text-[11px] sm:text-xs text-muted pt-2">{c.updated}</p>
    </LegalPageShell>
  );
}
