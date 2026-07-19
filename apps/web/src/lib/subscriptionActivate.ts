import type { PlanTier } from "@/lib/subscriptionTiers";
import { planByTier } from "@/lib/subscriptionTiers";
import { query } from "@/lib/db";

const PURCHASABLE: PlanTier[] = ["basic", "pro"];

export async function activateSubscription(
  userId: string,
  tier: PlanTier
): Promise<{ tier: PlanTier; expiresAt: string }> {
  if (!PURCHASABLE.includes(tier)) {
    throw new Error("Этот тариф нельзя активировать");
  }

  const plan = planByTier(tier);
  if (!plan) throw new Error("Тариф не найден");

  const rows = await query<{ id: string }>(
    `SELECT id FROM core.plans WHERE tier = $1`,
    [plan.dbTier]
  );
  const planId = rows[0]?.id;
  if (!planId) throw new Error("План не найден в базе");

  const inserted = await query<{ expires_at: Date }>(
    `INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at)
     VALUES ($1, $2, 'active', NOW() + INTERVAL '30 days')
     RETURNING expires_at`,
    [userId, planId]
  );

  const expiresAt = inserted[0]?.expires_at;
  if (!expiresAt) throw new Error("Не удалось активировать подписку");

  return { tier, expiresAt: expiresAt.toISOString() };
}
