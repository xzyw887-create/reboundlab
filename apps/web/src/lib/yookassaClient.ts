import { randomUUID } from "crypto";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { chargeRubForTier } from "@/lib/billingCharge";
import {
  attachYooPaymentId,
  insertPendingBillingPayment,
} from "@/lib/billingPayments";
import {
  yookassaConfigured,
  yookassaCredentials,
  yookassaReturnUrl,
  yookassaSendReceiptEnabled,
} from "@/lib/yookassaConfig";

type YooAmount = { value: string; currency: string };

export type YooPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: YooAmount;
  metadata?: Record<string, string>;
  confirmation?: { type: string; confirmation_url?: string };
};

function authHeader(): string {
  const creds = yookassaCredentials();
  if (!creds) throw new Error("YOOKASSA_NOT_CONFIGURED");
  return `Basic ${Buffer.from(`${creds.shopId}:${creds.secret}`).toString("base64")}`;
}

function tierLabel(tier: PlanTier): string {
  if (tier === "basic") return "Basic";
  if (tier === "pro") return "Pro";
  return tier;
}

export async function createYooKassaPayment(
  userId: string,
  userEmail: string,
  tier: PlanTier
): Promise<{ localPaymentId: string; confirmationUrl: string; yooPaymentId: string }> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const amountRub = chargeRubForTier(tier);
  if (amountRub <= 0) throw new Error("INVALID_TIER");

  const localPaymentId = await insertPendingBillingPayment(userId, tier, amountRub);

  const body: Record<string, unknown> = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: yookassaReturnUrl(localPaymentId),
    },
    description: `BackTest Pro — ${tierLabel(tier)}`,
    metadata: {
      user_id: userId,
      tier,
    },
  };

  if (yookassaSendReceiptEnabled() && userEmail.includes("@")) {
    body.receipt = {
      customer: { email: userEmail },
      items: [
        {
          description: `Подписка ${tierLabel(tier)} BackTest Pro`,
          quantity: "1.00",
          amount: { value: amountRub.toFixed(2), currency: "RUB" },
          vat_code: 1,
          payment_mode: "full_payment",
          payment_subject: "service",
        },
      ],
    };
  }

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as YooPayment & { description?: string; code?: string };

  if (!res.ok) {
    const msg = data.description || data.code || res.statusText;
    throw new Error(`YOOKASSA_CREATE_FAILED: ${msg}`);
  }

  const confirmationUrl = data.confirmation?.confirmation_url;
  if (!data.id || !confirmationUrl) {
    throw new Error("YOOKASSA_NO_CONFIRMATION_URL");
  }

  await attachYooPaymentId(localPaymentId, data.id);

  return {
    localPaymentId,
    confirmationUrl,
    yooPaymentId: data.id,
  };
}

export async function fetchYooKassaPayment(yooPaymentId: string): Promise<YooPayment> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${yooPaymentId}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const data = (await res.json()) as YooPayment & { description?: string };
  if (!res.ok) {
    throw new Error(data.description || "YOOKASSA_FETCH_FAILED");
  }
  return data;
}
