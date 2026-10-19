import { fulfillYooKassaPayment } from "@/lib/fulfillPayment";
import {
  applyLocalRenewal,
  claimDueCharge,
  isLocalMethod,
  listDueUserIds,
  markChargeFailed,
} from "@/lib/autopay";
import { createRecurringYooKassaPayment } from "@/lib/yookassaClient";
import { yookassaConfigured } from "@/lib/yookassaConfig";

export async function chargeDueForUser(userId: string): Promise<"skipped" | "charged" | "pending" | "failed"> {
  const charge = await claimDueCharge(userId);
  if (!charge) return "skipped";

  try {
    if (!yookassaConfigured() || isLocalMethod(charge.methodId, charge.methodType)) {
      await applyLocalRenewal(charge);
      return "charged";
    }

    const idempotenceKey = `renew-${charge.userId}-${charge.nextChargeAt}`;
    const payment = await createRecurringYooKassaPayment({
      userId: charge.userId,
      userEmail: charge.email,
      tier: charge.tier,
      amountRub: charge.amountRub,
      interval: charge.interval,
      paymentMethodId: charge.methodId,
      idempotenceKey,
    });

    if (payment.status === "succeeded" && payment.paid && payment.id) {
      await fulfillYooKassaPayment(payment.id);
      return "charged";
    }
    if (payment.status === "canceled") {
      await markChargeFailed(userId);
      return "failed";
    }
    return "pending";
  } catch (err) {
    await markChargeFailed(userId);
    throw err;
  }
}

export async function chargeAllDue(limit = 20): Promise<number> {
  const ids = await listDueUserIds(limit);
  let done = 0;
  for (const id of ids) {
    try {
      const result = await chargeDueForUser(id);
      if (result === "charged" || result === "pending") done += 1;
    } catch (err) {
      console.error("[autopay]", id, err);
    }
  }
  return done;
}
