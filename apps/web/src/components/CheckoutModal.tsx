"use client";

import { useEffect } from "react";
import type { SubscriptionPlan } from "@/lib/subscriptionTiers";

interface Props {
  open: boolean;
  plan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function CheckoutModal({
  open,
  plan,
  loading,
  error,
  onClose,
  onConfirm,
}: Props) {
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

  if (!open || !plan) return null;

  return (
    <div
      className="checkout-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={onClose}
    >
      <div className="checkout-panel" onClick={(e) => e.stopPropagation()}>
        <header className="checkout-header">
          <div>
            <p className="label-caps text-accent/80">Оплата подписки</p>
            <h2 id="checkout-title" className="text-xl font-bold text-white mt-1">
              {plan.name} — {plan.priceRubLabel} {plan.pricePeriod}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="pricing-window-close" aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="checkout-body space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Этап 1: оплата заглушка — как на Tiger.com, но без реального списания. После нажатия
            «Оплатить» тариф сразу активируется в аккаунте на 30 дней.
          </p>

          <div className="checkout-summary">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Тариф</span>
              <span className="text-white font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted">К оплате</span>
              <span className="text-white font-semibold tabular-nums">
                {plan.priceRubLabel} {plan.pricePeriod}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Номер карты</span>
              <input type="text" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Срок</span>
                <input type="text" placeholder="12/28" defaultValue="12/28" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted">CVC</span>
                <input type="text" placeholder="123" defaultValue="123" />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="btn-primary w-full"
          >
            {loading ? "Активация…" : `Оплатить ${plan.priceRubLabel}`}
          </button>

          <p className="text-[11px] text-center text-muted">
            На этапе 2 подключим ЮKassa / Stripe — карта будет списываться по-настоящему
          </p>
        </div>
      </div>
    </div>
  );
}
