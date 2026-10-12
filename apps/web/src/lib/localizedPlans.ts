import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/en";
import { formatTpl } from "@/lib/i18n";
import { chargeRubForTier, formatRubAmount } from "@/lib/billingCharge";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscriptionTiers";

function rubChargeLabel(plan: SubscriptionPlan): string {
  if (plan.priceRub === 0) {
    return plan.priceRubLabel.includes("₽") ? plan.priceRubLabel : `${plan.priceRubLabel} ₽`;
  }
  return `${plan.priceRubLabel} ₽`;
}

export function localizedPlans(t: Dictionary, locale: Locale): SubscriptionPlan[] {
  const copy = t.plans;
  return SUBSCRIPTION_PLANS.map((plan) => {
    const c = copy[plan.tier];
    if (!c) return plan;

    const rubCharge = rubChargeLabel(plan);
    const pricePeriod = c.pricePeriod ?? plan.pricePeriod;
    const priceNote = c.priceNote ?? plan.priceNote;

    const cardBlurb =
      "cardPitch" in c && typeof c.cardPitch === "string" ? c.cardPitch : undefined;

    if (locale === "en") {
      return {
        ...plan,
        name: c.name,
        tagline: c.tagline,
        pricePeriod,
        priceNote,
        cta: c.cta,
        cardBlurb,
        priceHeadline: plan.priceUsdLabel,
        priceBillingLine:
          plan.priceRub > 0
            ? formatTpl(t.pricingUi.billedInRub, { amount: rubCharge })
            : undefined,
        featureItems: c.features.map((label, i) => ({
          label,
          included: plan.featureItems[i]?.included ?? true,
        })),
      };
    }

    return {
      ...plan,
      name: c.name,
      tagline: c.tagline,
      pricePeriod,
      priceNote,
      cta: c.cta,
      cardBlurb,
      priceHeadline: rubCharge,
      featureItems: c.features.map((label, i) => ({
        label,
        included: plan.featureItems[i]?.included ?? true,
      })),
    };
  });
}

export function planCheckoutCharge(plan: SubscriptionPlan, t: Dictionary): string {
  const rub = chargeRubForTier(plan.tier);
  const label = formatRubAmount(rub);
  return `${label}${rub > 0 ? ` ${t.pricingUi.perMonthShort}` : ""}`;
}
