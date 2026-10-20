"use client";

import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@/lib/subscriptionTiers";
import { localizedPlans } from "@/lib/localizedPlans";
import {
  paidTierState,
  trialTierState,
  type PricingUserState,
} from "@/lib/pricingEligibility";
import { useLocale } from "@/lib/i18n";

function FeatureCheck({ included }: { included: boolean }) {
  if (included) {
    return (
      <span className="pricing-check pricing-check--on" aria-hidden>
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
          <path
            d="M2 6l3 3 5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="pricing-check pricing-check--off" aria-hidden>
      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
        <path
          d="M3 3l6 6M9 3L3 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function accentRing(accent: SubscriptionPlan["accent"]) {
  switch (accent) {
    case "violet":
      return "pricing-tier--violet";
    case "gold":
      return "pricing-tier--gold";
    case "cyan":
      return "pricing-tier--cyan";
    default:
      return "pricing-tier--muted";
  }
}

function TierCard({
  plan,
  onSelect,
  onPurchase,
  popularLabel,
  soonLabel,
  buttonState,
  devSwitch = false,
}: {
  plan: SubscriptionPlan;
  onSelect?: (tier: SubscriptionPlan["tier"]) => void;
  onPurchase?: (tier: SubscriptionPlan["tier"]) => void;
  popularLabel: string;
  soonLabel: string;
  buttonState?: { enabled: boolean; label?: string; hint?: string };
  devSwitch?: boolean;
}) {
  const router = useRouter();
  const disabled = buttonState && !buttonState.enabled;
  const ctaText = buttonState?.label ?? plan.cta;
  const ctaClass = plan.highlighted
    ? "btn-primary w-full shrink-0"
    : plan.comingSoon
      ? "pricing-cta-soon w-full shrink-0"
      : "pricing-cta-outline w-full shrink-0";

  const ctaWrap = "mt-4 shrink-0 pointer-events-none";

  const canPurchase =
    Boolean(onPurchase) &&
    !disabled &&
    (plan.tier === "basic" || plan.tier === "pro" || plan.tier === "trial");
  const canSelect = Boolean(onSelect) && !disabled;

  function activateCard() {
    if (plan.comingSoon || disabled) return;
    if (canPurchase && onPurchase) {
      onPurchase(plan.tier);
      return;
    }
    if (canSelect && onSelect) {
      onSelect(plan.tier);
      return;
    }
    if (plan.tier === "trial" && !disabled) {
      router.push("/login?next=/app");
      return;
    }
    if (plan.ctaHref && !plan.comingSoon) {
      router.push(plan.ctaHref);
    }
  }

  const interactive =
    !plan.comingSoon &&
    !disabled &&
    (canPurchase || canSelect || plan.tier === "trial" || Boolean(plan.ctaHref));

  return (
    <article
      id={plan.tier}
      className={`pricing-tier ${accentRing(plan.accent)} ${
        plan.highlighted ? "pricing-tier--popular" : ""
      } ${plan.comingSoon ? "pricing-tier--soon" : ""} ${
        interactive ? "pricing-tier--interactive cursor-pointer" : ""
      }`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${plan.name}: ${ctaText}` : undefined}
      onClick={interactive ? activateCard : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateCard();
              }
            }
          : undefined
      }
    >
      {plan.highlighted && (
        <span className="pricing-badge pricing-badge--popular">{popularLabel}</span>
      )}
      {plan.comingSoon && (
        <span className="pricing-badge pricing-badge--soon">{soonLabel}</span>
      )}

      <div className="pricing-tier-inner">
        <h3 className="text-lg font-bold text-white mt-0.5 tracking-tight">{plan.name}</h3>

        <div className="mt-3 flex items-baseline gap-1 flex-wrap">
          <span className="pricing-tier-price tabular-nums">
            {plan.priceHeadline ?? plan.priceRubLabel}
          </span>
          {plan.pricePeriod && (
            <span className="text-xs text-muted font-medium">{plan.pricePeriod}</span>
          )}
        </div>
        {plan.cardBlurb && (
          <p className="text-xs text-gray-300/90 mt-3 leading-relaxed border border-amber-500/20 bg-amber-950/20 rounded-lg px-3 py-2.5">
            {plan.cardBlurb}
          </p>
        )}

        <ul className="mt-4 space-y-2 flex-1 min-h-0 pb-1">
          {plan.featureItems.map((item) => (
            <li
              key={item.label}
              className={`flex items-start gap-2 text-xs leading-snug ${
                item.included ? "text-gray-200" : "text-muted/70"
              }`}
            >
              <FeatureCheck included={item.included} />
              <span className={item.included ? "" : "line-through decoration-muted/40"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {buttonState?.hint && (
          <p className="text-xs text-muted mt-4 leading-relaxed">{buttonState.hint}</p>
        )}

        {plan.comingSoon ? (
          <span className={`${ctaWrap} ${ctaClass}`}>{plan.cta}</span>
        ) : disabled ? (
          <div className={ctaWrap}>
            <span className={`${ctaClass} block text-center opacity-60 cursor-not-allowed`}>
              {ctaText}
            </span>
          </div>
        ) : (
          <div className={ctaWrap}>
            <span className={`${ctaClass} block text-center`} aria-hidden>
              {ctaText}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function PricingTierGrid({
  onPlanSelect,
  onPurchase,
  compact,
  plans: plansOverride,
  pricingUser,
  loggedIn = false,
  devTester = false,
}: {
  onPlanSelect?: (tier: SubscriptionPlan["tier"]) => void;
  onPurchase?: (tier: SubscriptionPlan["tier"]) => void;
  compact?: boolean;
  plans?: SubscriptionPlan[];
  pricingUser?: PricingUserState | null;
  loggedIn?: boolean;
  devTester?: boolean;
}) {
  const { t, locale } = useLocale();
  const plans = plansOverride ?? localizedPlans(t, locale);

  function buttonStateFor(plan: SubscriptionPlan) {
    if (devTester && (plan.tier === "trial" || plan.tier === "basic" || plan.tier === "pro")) {
      return { enabled: true };
    }
    if (plan.tier === "trial") {
      return trialTierState(loggedIn, pricingUser ?? null, devTester);
    }
    if (plan.tier === "basic" || plan.tier === "pro") {
      return paidTierState(plan.tier, pricingUser ?? null);
    }
    return { enabled: true };
  }

  return (
    <div className={`pricing-tier-grid ${compact ? "pricing-tier-grid--compact" : ""}`}>
      {plans.map((plan) => (
        <TierCard
          key={plan.tier}
          plan={plan}
          onSelect={onPlanSelect}
          onPurchase={onPurchase}
          devSwitch={devTester}
          popularLabel={t.pricingUi.popular}
          soonLabel={t.pricingUi.comingSoon}
          buttonState={buttonStateFor(plan)}
        />
      ))}
    </div>
  );
}
