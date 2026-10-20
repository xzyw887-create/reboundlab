import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";

/**
 * Сумма к списанию (checkout, ЮKassa). Карточки тарифов берут priceRub из каталога.
 * Пока идёт проверка оплат, Базовый и Про списываются по 1 ₽.
 */
export function chargeRubForTier(tier: PlanTier): number {
  if (tier === "basic" || tier === "pro") return 1;
  return planByTier(tier)?.priceRub ?? 0;
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
