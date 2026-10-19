import { ApiError } from "@/lib/apiErrors";
import { chargeRubForTier } from "@/lib/billingCharge";
import { annualChargeRubFromCatalogMonthly, parseBillingInterval } from "@/lib/billingInterval";
import {
  findPaymentByYooId,
  markPaymentSucceeded,
} from "@/lib/billingPayments";
import { enableAutopay, saveActivePaymentMethod } from "@/lib/autopay";
import { activateSubscription } from "@/lib/subscriptionActivate";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { describeYooMethod, fetchYooKassaPayment } from "@/lib/yookassaClient";

function parseTier(v: string | undefined): "basic" | "pro" | null {
  if (v === "basic" || v === "pro") return v;
  return null;
}

/** Идempotent: webhook или ручная проверка после return_url. */
export async function fulfillYooKassaPayment(
  yooPaymentId: string
): Promise<{ activated: boolean; userId: string; tier: PlanTier }> {
  const row = await findPaymentByYooId(yooPaymentId);
  if (!row) throw new ApiError("INVALID_REQUEST");

  if (row.activated_at) {
    const tier = parseTier(row.tier);
    if (!tier) throw new ApiError("INVALID_REQUEST");
    return { activated: false, userId: row.user_id, tier };
  }

  const remote = await fetchYooKassaPayment(yooPaymentId);
  if (remote.status !== "succeeded" || !remote.paid) {
    throw new ApiError("INVALID_REQUEST");
  }

  const tier = parseTier(row.tier) ?? parseTier(remote.metadata?.tier);
  if (!tier) throw new ApiError("INVALID_TIER");

  const paidRub = Math.round(Number(remote.amount.value));
  if (paidRub !== row.amount_rub) {
    throw new ApiError("INVALID_REQUEST");
  }

  const metaUser = remote.metadata?.user_id;
  if (metaUser && metaUser !== row.user_id) {
    throw new ApiError("INVALID_REQUEST");
  }

  const interval = parseBillingInterval(row.billing_interval ?? remote.metadata?.billing_interval);

  const activated = await activateSubscription(row.user_id, tier, { interval });
  const method = remote.payment_method;
  if (method?.id) {
    await saveActivePaymentMethod(row.user_id, {
      externalId: method.id,
      type: method.type || "bank_card",
      title: describeYooMethod(method),
      purpose: tier,
    });
    const monthly = chargeRubForTier(tier);
    await enableAutopay(row.user_id, {
      tier,
      interval,
      amountRub: interval === "year" ? annualChargeRubFromCatalogMonthly(monthly) : monthly,
      nextChargeAt: activated.expiresAt,
    });
  }
  await markPaymentSucceeded(yooPaymentId, true);

  return { activated: true, userId: row.user_id, tier };
}
