"use client";

import { useEffect } from "react";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { PricingTierGrid } from "@/components/PricingTierGrid";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (tier: PlanTier) => void;
}

export function PricingWindow({ open, onClose, onSelectPlan }: Props) {
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
            <div className="logo-box shrink-0">BP</div>
            <div className="min-w-0">
              <p className="label-caps text-accent/80">BackTest Pro</p>
              <h2 id="pricing-window-title" className="title-gradient text-xl truncate">
                Тарифы и подписки
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pricing-window-close"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="pricing-window-scroll">
          <p className="text-center text-muted text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            Выберите тариф — в калькуляторе активны только функции этого плана.
            Остальное видно, но серым и недоступно.
          </p>

          <PricingTierGrid
            onPlanSelect={(tier) => {
              onSelectPlan(tier);
              onClose();
            }}
          />

          <p className="text-center text-xs text-muted mt-8 pb-2">
            Комиссия в расчётах: taker 0.05% · funding Binance · кросс-маржа
          </p>
        </div>
      </div>
    </div>
  );
}
