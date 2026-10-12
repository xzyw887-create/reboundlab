import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";

function parseRubEnv(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/**
 * Сумма к списанию (checkout, ЮKassa). Не меняет цены на карточках тарифов.
 * Тест: BILLING_CHARGE_BASIC_RUB=100 и BILLING_CHARGE_PRO_RUB=100 на сервере.
 * Для подписи в модалке checkout дублируйте NEXT_PUBLIC_BILLING_CHARGE_* (опционально).
 * Уберите env — снова берётся priceRub из subscriptionTiers / core.plans.
 */
export function chargeRubForTier(tier: PlanTier): number {
  const plan = planByTier(tier);
  const catalog = plan?.priceRub ?? 0;

  if (tier === "basic") {
    const override =
      parseRubEnv(process.env.BILLING_CHARGE_BASIC_RUB) ??
      parseRubEnv(process.env.NEXT_PUBLIC_BILLING_CHARGE_BASIC_RUB);
    if (override != null) return override;
  }
  if (tier === "pro") {
    const override =
      parseRubEnv(process.env.BILLING_CHARGE_PRO_RUB) ??
      parseRubEnv(process.env.NEXT_PUBLIC_BILLING_CHARGE_PRO_RUB);
    if (override != null) return override;
  }

  return catalog;
}

export function formatRubAmount(rub: number): string {
  if (rub <= 0) return "0 ₽";
  return `${rub.toLocaleString("ru-RU")} ₽`;
}

/** Карточка показывает catalog, к оплате — charge (если задан override). */
export function isBillingTestCharge(tier: PlanTier): boolean {
  const plan = planByTier(tier);
  if (!plan || plan.priceRub <= 0) return false;
  return chargeRubForTier(tier) !== plan.priceRub;
}
