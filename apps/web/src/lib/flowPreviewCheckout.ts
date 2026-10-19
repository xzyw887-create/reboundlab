import { chargeRubForTier } from "@/lib/billingCharge";
import { annualChargeRubFromCatalogMonthly } from "@/lib/billingInterval";
import type { BillingInterval } from "@/lib/billingInterval";
import { query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import {
  activateBoundMethod,
  enableAutopay,
  saveActivePaymentMethod,
  unlinkPaymentMethod,
} from "@/lib/autopay";
import { activateSubscription } from "@/lib/subscriptionActivate";

const PREVIEW_CARD = "Карта ···· 4242";

async function latestSubscriptionId(userId: string): Promise<string | null> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM core.subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

/** Первый зашедший по ссылке становится аккаунтом для прохода оплаты. */
export async function enrollFlowPreview(userId: string): Promise<boolean> {
  await ensureBillingSchema();
  const others = await query<{ id: string }>(
    `SELECT id FROM core.users WHERE flow_preview = TRUE AND id <> $1 LIMIT 1`,
    [userId]
  );
  if (others[0]) return false;
  await query(`UPDATE core.users SET flow_preview = TRUE WHERE id = $1`, [userId]);
  return true;
}

/** Снять тариф и карту: дальше сайт ведёт на выбор оплаты. */
export async function clearPreviewSubscription(userId: string): Promise<void> {
  await ensureBillingSchema();
  const id = await latestSubscriptionId(userId);
  if (!id) return;
  await query(
    `UPDATE core.subscriptions s
     SET plan_id = p.id,
         status = 'trial',
         expires_at = NOW() - INTERVAL '1 day',
         trial_started = FALSE,
         autopay_enabled = FALSE,
         next_charge_at = NULL,
         autopay_status = 'idle'
     FROM core.plans p
     WHERE s.id = $1 AND p.tier = 'trial'`,
    [id]
  );
  await unlinkPaymentMethod(userId);
}

/** «Ок» на оплате: тариф включается и карта считается привязанной. */
export async function confirmPreviewCheckout(
  userId: string,
  tier: "trial" | "basic" | "pro",
  interval: BillingInterval
): Promise<void> {
  await ensureBillingSchema();
  const id = await latestSubscriptionId(userId);
  if (!id) throw new Error("SUBSCRIPTION_NOT_FOUND");

  if (tier === "trial") {
    await query(
      `UPDATE core.subscriptions SET trial_started = FALSE WHERE id = $1`,
      [id]
    );
    await activateBoundMethod(userId, {
      externalId: `local-${userId}`,
      type: "bank_card",
      title: PREVIEW_CARD,
      purpose: "trial",
    });
    return;
  }

  const activated = await activateSubscription(userId, tier, { interval });
  await saveActivePaymentMethod(userId, {
    externalId: `local-${userId}`,
    type: "bank_card",
    title: PREVIEW_CARD,
    purpose: tier,
  });
  const monthly = chargeRubForTier(tier);
  await enableAutopay(userId, {
    tier,
    interval,
    amountRub: interval === "year" ? annualChargeRubFromCatalogMonthly(monthly) : monthly,
    nextChargeAt: activated.expiresAt,
  });
}
