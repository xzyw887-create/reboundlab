"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CheckoutQuote } from "@/lib/billingCheckoutAmount";
import { chargeRubForTier, isBillingTestCharge } from "@/lib/billingCharge";
import { annualChargeRubFromCatalogMonthly } from "@/lib/billingInterval";
import {
  formatCheckoutDateRu,
  recurringChargeConsentPhrase,
  resolveNextChargeDate,
  subscriptionPeriodLabel,
} from "@/lib/checkoutSchedule";
import { SELLER_DETAILS_ANCHOR } from "@/lib/legalSeller";
import type { SubscriptionPlan } from "@/lib/subscriptionTiers";
import { planByTier } from "@/lib/subscriptionTiers";
import { planCheckoutCharge } from "@/lib/localizedPlans";
import { useLocale } from "@/lib/i18n";

interface Props {
  open: boolean;
  plan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  useYookassa?: boolean;
  /** Точная сумма с сервера (год / апгрейд / тест) */
  chargeOverride?: string | null;
  checkoutQuote?: CheckoutQuote | null;
  subscriptionExpiresAt?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  /** Кнопка «Ок» без перехода в кабинет банка. */
  previewOk?: boolean;
}

export function CheckoutModal({
  open,
  plan,
  loading,
  error,
  useYookassa = false,
  chargeOverride = null,
  checkoutQuote = null,
  subscriptionExpiresAt = null,
  onClose,
  onConfirm,
  previewOk = false,
}: Props) {
  const { t } = useLocale();
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConsent(false);
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

  const charge = chargeOverride ?? planCheckoutCharge(plan, t);
  const testCharge = isBillingTestCharge(plan.tier);
  const interval = checkoutQuote?.interval ?? "month";
  const isUpgrade = checkoutQuote?.isUpgrade ?? false;
  const catalogMonthly = planByTier(plan.tier)?.priceRub ?? 0;
  const annualCharge =
    catalogMonthly > 0 ? annualChargeRubFromCatalogMonthly(catalogMonthly) : 0;
  const proMonthly = chargeRubForTier("pro");
  const nextCharge = resolveNextChargeDate(interval, isUpgrade, subscriptionExpiresAt ?? null);
  const recurringPhrase = recurringChargeConsentPhrase(
    interval,
    chargeRubForTier(plan.tier),
    annualCharge,
    isUpgrade,
    proMonthly
  );

  const payDisabled = loading || !consent;

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
              {plan.name}
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
              Оплата на защищённой странице{" "}
              <strong className="text-gray-300">ЮKassa</strong> (карта, СБП и другие способы в
              кабинете). После успешного платежа тариф активируется автоматически.
            </p>
          ) : (
            !previewOk && (
              <p className="text-sm text-muted leading-relaxed">
                Режим разработки: без списания с карты. После оплаты тариф активируется в аккаунте.
              </p>
            )
          )}

          <div className="checkout-summary space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Тариф</span>
              <span className="text-white font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Период подписки</span>
              <span className="text-white font-medium">
                {isUpgrade ? "доплата за апгрейд" : subscriptionPeriodLabel(interval)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-border/50">
              <span className="text-muted">К оплате сегодня</span>
              <span className="text-white font-semibold tabular-nums">{charge}</span>
            </div>
            {!isUpgrade && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Следующее списание</span>
                <span className="text-white font-medium tabular-nums">
                  {formatCheckoutDateRu(nextCharge)}
                </span>
              </div>
            )}
            {isUpgrade && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Продление Pro</span>
                <span className="text-white font-medium tabular-nums">
                  {formatCheckoutDateRu(nextCharge)}
                </span>
              </div>
            )}
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

          <label className="checkout-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="checkout-consent-input"
            />
            <span className="checkout-consent-text text-xs leading-relaxed text-muted">
              Принимаю{" "}
              <Link
                href={`/terms#${SELLER_DETAILS_ANCHOR}`}
                className="text-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                оферту
              </Link>
              . Сегодня — {charge}, далее — {recurringPhrase}.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={payDisabled}
            onClick={onConfirm}
            className="btn-primary w-full disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {loading
              ? "…"
              : useYookassa || previewOk
                ? `Оформить подписку ${plan.name}`
                : `${t.pricingUi.pay} ${charge}`}
          </button>
        </div>
      </div>
    </div>
  );
}
