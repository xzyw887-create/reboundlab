import { ApiError } from "@/lib/apiErrors";
import type { BillingInterval } from "@/lib/billingInterval";
import { chargeRubForTier } from "@/lib/billingCharge";
import { query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import type { DevSubscriptionPreset } from "@/lib/devSubscriptionPreset";
import { TRIAL_DURATION_DAYS } from "@/lib/productPolicy";
import { activateSubscription } from "@/lib/subscriptionActivate";
import type { PlanTier } from "@/lib/subscriptionTiers";

export type SavedMethodInput = {
  externalId: string;
  type: string;
  title: string | null;
  purpose: string;
};

async function latestSubscriptionId(userId: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM core.subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const id = rows[0]?.id;
  if (!id) throw new ApiError("ACCOUNT_UPDATE_FAILED");
  return id;
}

export async function saveActivePaymentMethod(
  userId: string,
  method: SavedMethodInput
): Promise<void> {
  await ensureBillingSchema();
  await query(
    `UPDATE core.saved_payment_methods
     SET status = 'revoked'
     WHERE user_id = $1 AND status = 'active' AND yookassa_method_id <> $2`,
    [userId, method.externalId]
  );
  await query(
    `INSERT INTO core.saved_payment_methods
       (user_id, yookassa_method_id, method_type, title, status, purpose)
     VALUES ($1, $2, $3, $4, 'active', $5)
     ON CONFLICT (yookassa_method_id) DO UPDATE
     SET status = 'active',
         title = EXCLUDED.title,
         method_type = EXCLUDED.method_type,
         purpose = EXCLUDED.purpose,
         user_id = EXCLUDED.user_id`,
    [userId, method.externalId, method.type, method.title, method.purpose]
  );
}

export async function insertPendingPaymentMethod(
  userId: string,
  method: SavedMethodInput
): Promise<void> {
  await ensureBillingSchema();
  await query(
    `INSERT INTO core.saved_payment_methods
       (user_id, yookassa_method_id, method_type, title, status, purpose)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     ON CONFLICT (yookassa_method_id) DO UPDATE
     SET status = 'pending', purpose = EXCLUDED.purpose, method_type = EXCLUDED.method_type`,
    [userId, method.externalId, method.type, method.title, method.purpose]
  );
}

export async function enableAutopay(
  userId: string,
  opts: {
    tier: "basic" | "pro";
    interval: BillingInterval;
    amountRub: number;
    nextChargeAt: string;
  }
): Promise<void> {
  await ensureBillingSchema();
  const id = await latestSubscriptionId(userId);
  await query(
    `UPDATE core.subscriptions
     SET autopay_enabled = TRUE,
         autopay_tier = $2,
         autopay_interval = $3,
         autopay_amount_rub = $4,
         next_charge_at = $5,
         autopay_status = 'idle'
     WHERE id = $1`,
    [id, opts.tier, opts.interval, opts.amountRub, opts.nextChargeAt]
  );
}

export async function startTrialWithMethod(userId: string): Promise<void> {
  await ensureBillingSchema();
  const id = await latestSubscriptionId(userId);
  const amount = chargeRubForTier("basic");
  const rows = await query<{ id: string }>(
    `UPDATE core.subscriptions s
     SET plan_id = p.id,
         status = 'trial',
         expires_at = NOW() + INTERVAL '${TRIAL_DURATION_DAYS} day',
         trial_started = TRUE,
         autopay_enabled = TRUE,
         autopay_tier = 'basic',
         autopay_interval = 'month',
         autopay_amount_rub = $2,
         next_charge_at = NOW() + INTERVAL '${TRIAL_DURATION_DAYS} day',
         autopay_status = 'idle',
         started_at = NOW()
     FROM core.plans p
     WHERE s.id = $1
       AND p.tier = 'trial'
       AND s.trial_started = FALSE
     RETURNING s.id`,
    [id, amount]
  );
  if (!rows[0]) throw new ApiError("TRIAL_ALREADY_CLAIMED");
}

async function keepAccessWithAutopay(userId: string): Promise<void> {
  await ensureBillingSchema();
  const rows = await query<{
    id: string;
    tier: string;
    expires_at: Date | null;
  }>(
    `SELECT s.id, p.tier, s.expires_at
     FROM core.subscriptions s
     JOIN core.plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row?.expires_at || row.expires_at.getTime() <= Date.now()) {
    throw new ApiError("SUBSCRIPTION_EXPIRED");
  }
  const tier: "basic" | "pro" = row.tier === "pro" ? "pro" : "basic";
  await enableAutopay(userId, {
    tier,
    interval: "month",
    amountRub: chargeRubForTier(tier),
    nextChargeAt: row.expires_at.toISOString(),
  });
}

export async function activateBoundMethod(
  userId: string,
  method: SavedMethodInput
): Promise<void> {
  await saveActivePaymentMethod(userId, method);
  if (method.purpose === "trial") {
    await startTrialWithMethod(userId);
    return;
  }
  await keepAccessWithAutopay(userId);
}

export async function cancelAutopay(userId: string): Promise<void> {
  await ensureBillingSchema();
  const id = await latestSubscriptionId(userId);
  await query(
    `UPDATE core.subscriptions
     SET autopay_enabled = FALSE,
         next_charge_at = NULL,
         autopay_status = 'idle'
     WHERE id = $1`,
    [id]
  );
}

export async function unlinkPaymentMethod(userId: string): Promise<void> {
  await ensureBillingSchema();
  await query(
    `UPDATE core.saved_payment_methods
     SET status = 'revoked'
     WHERE user_id = $1 AND status IN ('active', 'pending')`,
    [userId]
  );
  await cancelAutopay(userId);
}

export async function attachLocalMethod(
  userId: string,
  purpose: string
): Promise<void> {
  await saveActivePaymentMethod(userId, {
    externalId: `local-${userId}`,
    type: "local",
    title: "Тестовая привязка",
    purpose,
  });
}

/** После локальной активации Basic/Pro: способ оплаты тестовый, следующее списание в конце периода. */
export async function attachStubAutopay(
  userId: string,
  tier: "basic" | "pro",
  interval: BillingInterval,
  expiresAt: string,
  amountRub: number
): Promise<void> {
  await attachLocalMethod(userId, tier);
  await enableAutopay(userId, { tier, interval, amountRub, nextChargeAt: expiresAt });
}

export async function syncDevTesterBilling(
  userId: string,
  preset: DevSubscriptionPreset
): Promise<void> {
  await attachLocalMethod(userId, preset);
  const expired = preset.endsWith("_expired");
  if (expired) {
    await cancelAutopay(userId);
    return;
  }
  const rows = await query<{ expires_at: Date | null }>(
    `SELECT expires_at FROM core.subscriptions
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const expires = rows[0]?.expires_at;
  if (!expires) return;
  const tier: "basic" | "pro" = preset === "pro" ? "pro" : "basic";
  await enableAutopay(userId, {
    tier,
    interval: "month",
    amountRub: chargeRubForTier(tier),
    nextChargeAt: expires.toISOString(),
  });
}

export type DueCharge = {
  userId: string;
  email: string;
  tier: "basic" | "pro";
  interval: BillingInterval;
  amountRub: number;
  nextChargeAt: string;
  methodId: string;
  methodType: string;
};

export async function claimDueCharge(userId: string): Promise<DueCharge | null> {
  await ensureBillingSchema();
  const locked = await query<{ id: string }>(
    `UPDATE core.subscriptions
     SET autopay_status = 'charging', last_charge_at = NOW()
     WHERE user_id = $1
       AND autopay_enabled = TRUE
       AND next_charge_at IS NOT NULL
       AND next_charge_at <= NOW()
       AND (
         autopay_status = 'idle'
         OR (autopay_status = 'failed' AND last_charge_at < NOW() - INTERVAL '6 hours')
         OR (autopay_status = 'charging' AND (last_charge_at IS NULL OR last_charge_at < NOW() - INTERVAL '20 minutes'))
       )
     RETURNING id`,
    [userId]
  );
  if (!locked[0]) return null;

  const rows = await query<{
    email: string;
    autopay_tier: string | null;
    autopay_interval: string | null;
    autopay_amount_rub: number | null;
    next_charge_at: Date;
    yookassa_method_id: string;
    method_type: string;
  }>(
    `SELECT u.email, s.autopay_tier, s.autopay_interval, s.autopay_amount_rub, s.next_charge_at,
            pm.yookassa_method_id, pm.method_type
     FROM core.subscriptions s
     JOIN core.users u ON u.id = s.user_id
     JOIN core.saved_payment_methods pm
       ON pm.user_id = s.user_id AND pm.status = 'active'
     WHERE s.id = $1
     ORDER BY pm.created_at DESC
     LIMIT 1`,
    [locked[0].id]
  );
  const row = rows[0];
  if (!row || (row.autopay_tier !== "basic" && row.autopay_tier !== "pro")) {
    await markChargeFailed(userId);
    return null;
  }
  const amount = row.autopay_amount_rub ?? chargeRubForTier(row.autopay_tier);
  return {
    userId,
    email: row.email,
    tier: row.autopay_tier,
    interval: row.autopay_interval === "year" ? "year" : "month",
    amountRub: amount,
    nextChargeAt: row.next_charge_at.toISOString(),
    methodId: row.yookassa_method_id,
    methodType: row.method_type,
  };
}

export async function markChargeFailed(userId: string): Promise<void> {
  await query(
    `UPDATE core.subscriptions
     SET autopay_status = 'failed'
     WHERE user_id = $1 AND autopay_status = 'charging'`,
    [userId]
  );
}

/** Локальная привязка: продлеваем период без банка. */
export async function applyLocalRenewal(charge: DueCharge): Promise<void> {
  const activated = await activateSubscription(charge.userId, charge.tier, {
    interval: charge.interval,
  });
  await enableAutopay(charge.userId, {
    tier: charge.tier,
    interval: charge.interval,
    amountRub: charge.amountRub,
    nextChargeAt: activated.expiresAt,
  });
}

export async function listDueUserIds(limit = 20): Promise<string[]> {
  await ensureBillingSchema();
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM core.subscriptions
     WHERE autopay_enabled = TRUE
       AND next_charge_at IS NOT NULL
       AND next_charge_at <= NOW()
       AND autopay_status IN ('idle', 'failed', 'charging')
     ORDER BY next_charge_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => r.user_id);
}

export function localMethodId(userId: string): string {
  return `local-${userId}`;
}

export function isLocalMethod(methodId: string, methodType: string): boolean {
  return methodType === "local" || methodId.startsWith("local-");
}

export type AutopayTier = Extract<PlanTier, "basic" | "pro">;
