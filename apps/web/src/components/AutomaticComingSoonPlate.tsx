"use client";

import { useLocale } from "@/lib/i18n";

export function AutomaticComingSoonPlate() {
  const { t } = useLocale();

  return (
    <div
      className="automatic-soon-plate"
      aria-disabled="true"
      title={t.strategy.automaticSoonHint}
    >
      <span className="automatic-soon-badge">{t.pricingUi.comingSoon}</span>
      <p className="text-sm font-semibold text-amber-100/95 tracking-tight">
        Automatic
      </p>
      <p className="text-xs text-muted mt-1 leading-snug max-w-md">{t.strategy.automaticSoonHint}</p>
    </div>
  );
}
