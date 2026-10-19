import { mapDbTierToUi } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import { TRIAL_DURATION_DAYS } from "@/lib/productPolicy";
import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";
import { anchorDayFromDate } from "@/lib/billingPeriod";
import type { DevSubscriptionPreset } from "@/lib/devSubscriptionPreset";

export type { DevSubscriptionPreset } from "@/lib/devSubscriptionPreset";

import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";

export function devLocalSubscriptionToolsAllowed(email: string | null | undefined): boolean {
  return isDevLocalTesterAccount(email);
}

function presetToPlan(preset: DevSubscriptionPreset): {
  dbTier: "trial" | "starter" | "pro";
  status: "trial" | "active";
  expiresAt: Date;
  billingAnchorDay: number | null;
} {
  const now = Date.now();
  const day = 86400000;

  switch (preset) {
    case "trial":
      return {
        dbTier: "trial",
        status: "trial",
        expiresAt: new Date(now + TRIAL_DURATION_DAYS * day),
        billingAnchorDay: null,
      };
    case "trial_expired":
      return {
        dbTier: "trial",
        status: "trial",
        expiresAt: new Date(now - day),
        billingAnchorDay: null,
      };
    case "basic":
      return {
        dbTier: "starter",
        status: "active",
        expiresAt: new Date(now + 30 * day),
        billingAnchorDay: anchorDayFromDate(new Date()),
      };
    case "pro":
      return {
        dbTier: "pro",
        status: "active",
        expiresAt: new Date(now + 30 * day),
        billingAnchorDay: anchorDayFromDate(new Date()),
      };
    case "basic_expired":
      return {
        dbTier: "starter",
        status: "active",
        expiresAt: new Date(now - day),
        billingAnchorDay: anchorDayFromDate(new Date()),
      };
    case "pro_expired":
      return {
        dbTier: "pro",
        status: "active",
        expiresAt: new Date(now - day),
        billingAnchorDay: anchorDayFromDate(new Date()),
      };
    default:
      throw new Error("UNKNOWN_PRESET");
  }
}

export async function applyDevSubscriptionPreset(
  userId: string,
  email: string,
  preset: DevSubscriptionPreset
): Promise<{ planTier: PlanTier; expiresAt: string }> {
  if (!devLocalSubscriptionToolsAllowed(email)) {
    throw new Error("DEV_TOOLS_DISABLED");
  }

  await ensureBillingSchema();

  const spec = presetToPlan(preset);
  const uiTier = mapDbTierToUi(spec.dbTier);
  const def = planByTier(uiTier);
  if (!def) throw new Error("PLAN_NOT_FOUND");

  const planRows = await query<{ id: string }>(
    `SELECT id FROM core.plans WHERE tier = $1`,
    [def.dbTier]
  );
  const planId = planRows[0]?.id;
  if (!planId) throw new Error("PLAN_NOT_IN_DB");

  const subs = await query<{ id: string }>(
    `SELECT id FROM core.subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const subId = subs[0]?.id;
  if (!subId) throw new Error("SUBSCRIPTION_NOT_FOUND");

  await query(
    `UPDATE core.subscriptions
     SET plan_id = $1,
         status = $2,
         expires_at = $3,
         billing_anchor_day = $4,
         started_at = CASE WHEN $6 = 'active' THEN NOW() ELSE started_at END
     WHERE id = $5`,
    [planId, spec.status, spec.expiresAt.toISOString(), spec.billingAnchorDay, subId, spec.status]
  );

  return {
    planTier: uiTier,
    expiresAt: spec.expiresAt.toISOString(),
  };
}
