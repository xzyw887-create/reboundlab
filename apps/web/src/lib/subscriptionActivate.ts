import type { PlanTier } from "@/lib/subscriptionTiers";
import { planByTier } from "@/lib/subscriptionTiers";
import { query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import type { BillingInterval } from "@/lib/billingInterval";
import {
  anchorDayFromDate,
  periodEndAfterAnnualRenewal,
  periodEndAfterRenewal,
  periodEndFromAnnualPayment,
  periodEndFromPayment,
} from "@/lib/billingPeriod";
import { mapDbTierToUi } from "@/lib/auth";

const PURCHASABLE: PlanTier[] = ["basic", "pro"];

type CurrentSubRow = {
  id: string;
  db_tier: string;
  expires_at: Date | null;
  billing_anchor_day: number | null;
};

async function loadCurrentSubscription(userId: string): Promise<{
  id: string;
  dbTier: string;
  expires_at: Date | null;
  billing_anchor_day: number | null;
} | null> {
  const rows = await query<CurrentSubRow>(
    `SELECT s.id, p.tier AS db_tier, s.expires_at, s.billing_anchor_day
     FROM core.subscriptions s
     JOIN core.plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    dbTier: row.db_tier,
    expires_at: row.expires_at,
    billing_anchor_day: row.billing_anchor_day,
  };
}

function isExpired(expiresAt: Date | null): boolean {
  return expiresAt != null && expiresAt.getTime() < Date.now();
}

export async function activateSubscription(
  userId: string,
  tier: PlanTier,
  options?: { interval?: BillingInterval }
): Promise<{ tier: PlanTier; expiresAt: string; billingAnchorDay: number | null }> {
  const interval: BillingInterval = options?.interval === "year" ? "year" : "month";
  if (!PURCHASABLE.includes(tier)) {
    throw new Error("Этот тариф нельзя активировать");
  }

  await ensureBillingSchema();

  const plan = planByTier(tier);
  if (!plan) throw new Error("Тариф не найден");

  const planRows = await query<{ id: string }>(
    `SELECT id FROM core.plans WHERE tier = $1`,
    [plan.dbTier]
  );
  const planId = planRows[0]?.id;
  if (!planId) throw new Error("План не найден в базе");

  const current = await loadCurrentSubscription(userId);
  if (!current) throw new Error("Подписка не найдена");

  const paidAt = new Date();
  const currentUi = mapDbTierToUi(current.dbTier);
  const onTrial = current.dbTier === "trial";
  const paidActive = !onTrial && !isExpired(current.expires_at);

  let billingAnchorDay: number;
  let expiresAt: Date;

  const endFromPayment = (anchor: number) =>
    interval === "year"
      ? periodEndFromAnnualPayment(paidAt, anchor)
      : periodEndFromPayment(paidAt, anchor);

  const endFromRenewal = (cur: Date, anchor: number) =>
    interval === "year"
      ? periodEndAfterAnnualRenewal(cur, anchor)
      : periodEndAfterRenewal(cur, anchor);

  if (onTrial) {
    billingAnchorDay = anchorDayFromDate(paidAt);
    expiresAt = endFromPayment(billingAnchorDay);
  } else if (isExpired(current.expires_at)) {
    billingAnchorDay = current.billing_anchor_day ?? anchorDayFromDate(paidAt);
    expiresAt = endFromPayment(billingAnchorDay);
  } else if (paidActive && currentUi === "basic" && tier === "pro") {
    if (!current.expires_at) throw new Error("Нет даты окончания подписки");
    billingAnchorDay = current.billing_anchor_day ?? anchorDayFromDate(paidAt);
    expiresAt = current.expires_at;
  } else if (paidActive && currentUi === tier) {
    if (!current.expires_at) throw new Error("Нет даты окончания подписки");
    billingAnchorDay = current.billing_anchor_day ?? anchorDayFromDate(paidAt);
    expiresAt = endFromRenewal(current.expires_at, billingAnchorDay);
  } else if (paidActive && currentUi === "pro" && tier === "basic") {
    throw new Error("Понижение до Basic — после окончания текущего периода Pro");
  } else {
    billingAnchorDay = anchorDayFromDate(paidAt);
    expiresAt = endFromPayment(billingAnchorDay);
  }

  await query(
    `UPDATE core.subscriptions
     SET plan_id = $1,
         status = 'active',
         expires_at = $2,
         billing_anchor_day = $3,
         started_at = CASE WHEN status = 'trial' THEN NOW() ELSE started_at END
     WHERE id = $4`,
    [planId, expiresAt.toISOString(), billingAnchorDay, current.id]
  );

  return {
    tier,
    expiresAt: expiresAt.toISOString(),
    billingAnchorDay,
  };
}
