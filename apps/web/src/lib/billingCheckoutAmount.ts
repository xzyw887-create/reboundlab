import type { BillingInterval } from "@/lib/billingInterval";
import {
  annualChargeRubFromCatalogMonthly,
  parseBillingInterval,
} from "@/lib/billingInterval";
import { chargeRubForTier } from "@/lib/billingCharge";
import type { PricingUserState } from "@/lib/pricingEligibility";
import { assertCanPurchaseTier } from "@/lib/pricingEligibility";
import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";
import { upgradeTopUpRub } from "@/lib/billingUpgrade";

function catalogMonthlyRub(tier: PlanTier): number {
  return planByTier(tier)?.priceRub ?? 0;
}

function isTestOverride(tier: PlanTier): boolean {
  return chargeRubForTier(tier) !== catalogMonthlyRub(tier);
}

export type CheckoutQuote = {
  amountRub: number;
  interval: BillingInterval;
  isUpgrade: boolean;
};

export function quoteCheckoutAmount(
  user: PricingUserState & {
    expiresAt: string | null;
    billingAnchorDay: number | null;
  },
  tier: "basic" | "pro",
  intervalRaw: unknown
): CheckoutQuote {
  assertCanPurchaseTier(user, tier);
  const interval = parseBillingInterval(intervalRaw);

  const monthlyCharge = chargeRubForTier(tier);
  const basicMonthly = chargeRubForTier("basic");
  const proMonthly = chargeRubForTier("pro");

  const onBasic =
    user.planTier === "basic" &&
    !user.subscriptionExpired &&
    tier === "pro";

  if (onBasic) {
    const expires = user.expiresAt ? new Date(user.expiresAt) : null;
    const anchor = user.billingAnchorDay ?? expires?.getUTCDate() ?? 1;
    const topUp =
      expires && !isTestOverride("basic") && !isTestOverride("pro")
        ? upgradeTopUpRub(basicMonthly, proMonthly, expires, anchor)
        : Math.max(0, proMonthly - basicMonthly);
    return {
      amountRub: Math.max(1, topUp),
      interval: "month",
      isUpgrade: true,
    };
  }

  if (isTestOverride(tier)) {
    return { amountRub: monthlyCharge, interval, isUpgrade: false };
  }

  const catalog = catalogMonthlyRub(tier);
  if (interval === "year") {
    return {
      amountRub: annualChargeRubFromCatalogMonthly(catalog),
      interval: "year",
      isUpgrade: false,
    };
  }

  return { amountRub: monthlyCharge, interval: "month", isUpgrade: false };
}
