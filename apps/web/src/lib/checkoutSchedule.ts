import type { BillingInterval } from "@/lib/billingInterval";
import { formatRubAmount } from "@/lib/billingCharge";

/** Дата следующего списания для отображения в checkout (локальный календарь). */
export function nextChargeAt(from: Date, interval: BillingInterval): Date {
  const result = new Date(from.getTime());
  const anchor = result.getDate();
  if (interval === "year") {
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }
  result.setMonth(result.getMonth() + 1);
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(anchor, maxDay));
  return result;
}

export function formatCheckoutDateRu(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function subscriptionPeriodLabel(interval: BillingInterval): string {
  return interval === "year" ? "12 месяцев" : "1 месяц";
}

/** Фраза о будущих списаниях для чекбокса согласия (не юр. консультация). */
export function recurringChargeConsentPhrase(
  interval: BillingInterval,
  monthlyCatalogRub: number,
  annualChargeRub: number,
  isUpgrade: boolean,
  proMonthlyRub: number
): string {
  if (isUpgrade) {
    return `${formatRubAmount(proMonthlyRub)} в месяц после текущего периода`;
  }
  if (interval === "year") {
    return `${formatRubAmount(annualChargeRub)} раз в 12 месяцев`;
  }
  return `${formatRubAmount(monthlyCatalogRub)} каждый месяц`;
}

export function resolveNextChargeDate(
  interval: BillingInterval,
  isUpgrade: boolean,
  expiresAtIso: string | null
): Date {
  if (isUpgrade && expiresAtIso) {
    const d = new Date(expiresAtIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return nextChargeAt(new Date(), interval);
}
