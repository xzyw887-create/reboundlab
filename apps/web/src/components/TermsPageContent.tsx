"use client";

import { useEffect } from "react";
import { LegalDocSections } from "@/components/LegalDocSections";
import { LegalPageShell } from "@/components/LegalPageShell";
import { LegalSellerBlock } from "@/components/LegalSellerBlock";
import { termsPageCopy } from "@/lib/i18n/legalTermsSections";
import { useLocale } from "@/lib/i18n";

export function TermsPageContent() {
  const { locale } = useLocale();
  const c = termsPageCopy[locale];

  useEffect(() => {
    document.title = c.metaTitle;
  }, [c.metaTitle]);

  return (
    <LegalPageShell title={c.title} subtitle={c.subtitle}>
      <LegalDocSections sections={c.sections} />

      <LegalSellerBlock
        heading={c.sellerHeading}
        innLabel={c.sellerInnLabel}
        helpChannelsLabel={c.sellerChannels}
        updated={c.updated}
      />
    </LegalPageShell>
  );
}
