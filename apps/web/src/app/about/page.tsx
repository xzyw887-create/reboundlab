"use client";

import { LegalPageShell } from "@/components/LegalPageShell";
import { useLocale } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <LegalPageShell title={t.about.title} subtitle={t.about.subtitle}>
      <p>{t.about.p1}</p>
      <p>{t.about.p2}</p>
      <p>{t.about.p3}</p>
    </LegalPageShell>
  );
}
