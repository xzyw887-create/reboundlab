"use client";

import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { PricingTierGrid } from "@/components/PricingTierGrid";
import { useLocale } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (tier: PlanTier) => void;
}

export function PricingWindow({ open, onClose, onSelectPlan }: Props) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pricing-window-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-window-title"
      onClick={onClose}
    >
      <div className="pricing-window" onClick={(e) => e.stopPropagation()}>
        <header className="pricing-window-header">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" decorative className="shrink-0" />
            <div className="min-w-0">
              <p className="label-caps text-sky-300/90">BackTest Pro</p>
              <h2 id="pricing-window-title" className="title-gradient text-xl truncate">
                {t.pricingUi.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pricing-window-close"
            aria-label={t.pricingUi.close}
          >
            ×
          </button>
        </header>

        <div className="pricing-window-scroll">
          <p className="text-center text-muted text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            {t.pricingUi.lead}
          </p>

          <PricingTierGrid
            onPlanSelect={(tier) => {
              onSelectPlan(tier);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
