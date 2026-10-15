"use client";

import { useEffect } from "react";
import { isBillingTestCharge } from "@/lib/billingCharge";
import type { SubscriptionPlan } from "@/lib/subscriptionTiers";
import { planCheckoutCharge } from "@/lib/localizedPlans";
import { useLocale } from "@/lib/i18n";

interface Props {
  open: boolean;
  plan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  useYookassa?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CheckoutModal({
  open,
  plan,
  loading,
  error,
  useYookassa = false,
  onClose,
  onConfirm,
}: Props) {
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

  if (!open || !plan) return null;

  const charge = planCheckoutCharge(plan, t);
  const testCharge = isBillingTestCharge(plan.tier);

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
            <p className="label-caps text-sky-300/90">Оплата подписки</p>
            <h2 id="checkout-title" className="text-xl font-bold text-white mt-1">
              {plan.name} — {charge}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="pricing-window-close" aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="checkout-body space-y-4">
          {testCharge && (
            <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-700/40 rounded-lg px-3 py-2">
              Тестовая сумма к оплате — {charge}. На карточках тарифа указана полная цена; списание
              идёт по сумме на сервере.
            </p>
          )}

          {useYookassa ? (
            <p className="text-sm text-muted leading-relaxed">
              Вы перейдёте на защищённую страницу оплаты{" "}
              <strong className="text-gray-300">ЮKassa</strong> (карта, СБП и другие способы,
              доступные в кабинете). После успешного платежа тариф активируется автоматически;
              период подписки — календарный месяц от дня оплаты.
            </p>
          ) : (
            <p className="text-sm text-muted leading-relaxed">
              Режим разработки: без списания с карты. После «Оплатить» тариф активируется в
              аккаунте (календарный месяц от «оплаты»).
            </p>
          )}

          <div className="checkout-summary">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Тариф</span>
              <span className="text-white font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted">К оплате</span>
              <span className="text-white font-semibold tabular-nums">{charge}</span>
            </div>
          </div>

          {!useYookassa && (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Номер карты (демо)</span>
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
          )}

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
            {loading
              ? "…"
              : useYookassa
                ? `Перейти к оплате ${charge}`
                : `${t.pricingUi.pay} ${charge}`}
          </button>
        </div>
      </div>
    </div>
  );
}
