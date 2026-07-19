"use client";

import Link from "next/link";
import type { SubscriptionPlan } from "@/lib/subscriptionTiers";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionTiers";

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
}: {
  plan: SubscriptionPlan;
  onSelect?: (tier: SubscriptionPlan["tier"]) => void;
  onPurchase?: (tier: SubscriptionPlan["tier"]) => void;
}) {
  const ctaClass = plan.highlighted
    ? "btn-primary w-full"
    : plan.comingSoon
      ? "pricing-cta-soon w-full"
      : "pricing-cta-outline w-full";

  return (
    <article
      id={plan.tier}
      className={`pricing-tier ${accentRing(plan.accent)} ${
        plan.highlighted ? "pricing-tier--popular" : ""
      } ${plan.comingSoon ? "pricing-tier--soon" : ""}`}
    >
      {plan.highlighted && (
        <span className="pricing-badge pricing-badge--popular">Популярный</span>
      )}
      {plan.comingSoon && (
        <span className="pricing-badge pricing-badge--soon">Скоро</span>
      )}

      <div className="pricing-tier-inner">
        <p className="label-caps text-accent/70">{plan.tagline}</p>
        <h3 className="text-xl font-bold text-white mt-1 tracking-tight">{plan.name}</h3>

        <div className="mt-5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-4xl font-bold text-white tabular-nums">
            {plan.priceRubLabel}
          </span>
          {plan.pricePeriod && (
            <span className="text-sm text-muted font-medium">{plan.pricePeriod}</span>
          )}
        </div>
        {plan.priceNote && (
          <p className="text-xs text-muted mt-2 leading-relaxed">{plan.priceNote}</p>
        )}

        <ul className="mt-6 space-y-3 flex-1">
          {plan.featureItems.map((item) => (
            <li
              key={item.label}
              className={`flex items-start gap-3 text-sm leading-snug ${
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

        {plan.comingSoon ? (
          <span className={ctaClass}>{plan.cta}</span>
        ) : onPurchase && (plan.tier === "basic" || plan.tier === "pro") ? (
          <button
            type="button"
            onClick={() => onPurchase(plan.tier)}
            className={ctaClass}
          >
            {plan.cta}
          </button>
        ) : onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(plan.tier)}
            className={ctaClass}
          >
            {plan.cta}
          </button>
        ) : plan.tier === "trial" ? (
          <Link href="/register" className={`${ctaClass} block text-center`}>
            {plan.cta}
          </Link>
        ) : (
          <Link href={plan.ctaHref} className={`${ctaClass} block text-center`}>
            {plan.cta}
          </Link>
        )}
      </div>
    </article>
  );
}

export function PricingTierGrid({
  onPlanSelect,
  onPurchase,
  compact,
}: {
  onPlanSelect?: (tier: SubscriptionPlan["tier"]) => void;
  onPurchase?: (tier: SubscriptionPlan["tier"]) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
          : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6"
      }
    >
      {SUBSCRIPTION_PLANS.map((plan) => (
        <TierCard
          key={plan.tier}
          plan={plan}
          onSelect={onPlanSelect}
          onPurchase={onPurchase}
        />
      ))}
    </div>
  );
}
