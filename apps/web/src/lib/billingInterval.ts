export type BillingInterval = "month" | "year";

/** −30% к отображаемой месячной цене при оплате за год */
export const ANNUAL_MONTHLY_DISCOUNT = 0.7;

export function parseBillingInterval(v: unknown): BillingInterval {
  return v === "year" ? "year" : "month";
}

/** Красивое годовое списание (≈ месяц×0,7×12) */
export function annualChargeRubFromCatalogMonthly(monthlyCatalogRub: number): number {
  if (monthlyCatalogRub <= 0) return 0;
  const raw = monthlyCatalogRub * ANNUAL_MONTHLY_DISCOUNT * 12;
  const roundedThousands = Math.round(raw / 1000);
  return Math.max(monthlyCatalogRub, roundedThousands * 1000 - 10);
}

export function displayMonthlyRub(monthlyCatalogRub: number, interval: BillingInterval): number {
  if (monthlyCatalogRub <= 0) return 0;
  if (interval === "year") {
    const discounted = Math.round((monthlyCatalogRub * ANNUAL_MONTHLY_DISCOUNT) / 10) * 10;
    return discounted >= 1 ? discounted : monthlyCatalogRub;
  }
  return monthlyCatalogRub;
}
