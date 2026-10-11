"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";
import { legalCopy } from "@/lib/i18n/legalContent";
import { useLocale } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/supportContact";

export function PrivacyPageContent() {
  const { locale } = useLocale();
  const c = legalCopy[locale].privacy;

  useEffect(() => {
    document.title = c.metaTitle;
  }, [c.metaTitle]);

  return (
    <LegalPageShell title={c.title} subtitle={c.subtitle}>
      <p>{c.intro}</p>
      <h2 className="text-lg font-semibold text-white pt-4">{c.collectHeading}</h2>
      <ul className="list-disc pl-5 space-y-1">
        {c.collectItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="text-lg font-semibold text-white pt-4">{c.purposeHeading}</h2>
      <p>{c.purposeBody}</p>
      <h2 className="text-lg font-semibold text-white pt-4">{c.thirdPartyHeading}</h2>
      <p>{c.thirdPartyBody}</p>
      <h2 className="text-lg font-semibold text-white pt-4">{c.rightsHeading}</h2>
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
      <p className="text-xs text-muted pt-6">{c.updated}</p>
    </LegalPageShell>
  );
}
