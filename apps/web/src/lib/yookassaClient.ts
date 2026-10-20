import { randomUUID } from "crypto";
import type { CheckoutQuote } from "@/lib/billingCheckoutAmount";
import type { BillingInterval } from "@/lib/billingInterval";
import type { PlanTier } from "@/lib/subscriptionTiers";
import {
  attachYooPaymentId,
  insertPendingBillingPayment,
} from "@/lib/billingPayments";
import { isTelegramPlaceholderEmail } from "@/lib/telegramIdentity";
import {
  yookassaConfigured,
  yookassaCredentials,
  yookassaReturnUrl,
  yookassaSendReceiptEnabled,
} from "@/lib/yookassaConfig";

type YooAmount = { value: string; currency: string };

export type YooMethod = {
  id: string;
  status?: string;
  type?: string;
  saved?: boolean;
  title?: string;
  card?: { last4?: string; card_type?: string };
};

export type YooPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: YooAmount;
  metadata?: Record<string, string>;
  confirmation?: { type: string; confirmation_url?: string };
  payment_method?: YooMethod;
};

function yooFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
}

function authHeader(): string {
  const creds = yookassaCredentials();
  if (!creds) throw new Error("YOOKASSA_NOT_CONFIGURED");
  return `Basic ${Buffer.from(`${creds.shopId}:${creds.secret}`).toString("base64")}`;
}

function attachReceipt(
  body: Record<string, unknown>,
  email: string,
  description: string,
  amountRub: number
): void {
  if (!yookassaSendReceiptEnabled()) return;
  if (!email.includes("@") || isTelegramPlaceholderEmail(email)) return;
  body.receipt = {
    customer: { email },
    items: [
      {
        description,
        quantity: "1.00",
        amount: { value: amountRub.toFixed(2), currency: "RUB" },
        vat_code: 1,
        payment_mode: "full_payment",
        payment_subject: "service",
      },
    ],
  };
}

function tierLabel(tier: PlanTier): string {
  if (tier === "basic") return "Basic";
  if (tier === "pro") return "Pro";
  return tier;
}

export async function createYooKassaPayment(
  userId: string,
  userEmail: string,
  tier: PlanTier,
  quote: CheckoutQuote
): Promise<{ localPaymentId: string; confirmationUrl: string; yooPaymentId: string }> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const amountRub = quote.amountRub;
  if (amountRub <= 0) throw new Error("INVALID_TIER");

  const localPaymentId = await insertPendingBillingPayment(
    userId,
    tier,
    amountRub,
    quote.interval
  );

  const body: Record<string, unknown> = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    save_payment_method: true,
    confirmation: {
      type: "redirect",
      return_url: yookassaReturnUrl(localPaymentId),
    },
    description: `BackTest Pro — ${tierLabel(tier)}${quote.isUpgrade ? " (апгрейд)" : ""}`,
    metadata: {
      user_id: userId,
      tier,
      billing_interval: quote.interval,
      upgrade: quote.isUpgrade ? "1" : "0",
    },
  };

  attachReceipt(
    body,
    userEmail,
    `Подписка ${tierLabel(tier)} BackTest Pro`,
    amountRub
  );

  const res = await yooFetch("https://api.yookassa.ru/v3/payments", {
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

  const res = await yooFetch(`https://api.yookassa.ru/v3/payments/${yooPaymentId}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const data = (await res.json()) as YooPayment & { description?: string };
  if (!res.ok) {
    throw new Error(data.description || "YOOKASSA_FETCH_FAILED");
  }
  return data;
}

export function describeYooMethod(method: YooMethod): string | null {
  if (method.title) return method.title;
  const last4 = method.card?.last4;
  if (last4) {
    const brand = method.card?.card_type ? `${method.card.card_type} ` : "";
    return `${brand}•••• ${last4}`;
  }
  if (method.type === "sbp") return "СБП";
  if (method.type === "bank_card") return "Карта";
  return null;
}

export async function createYooKassaPaymentMethod(input: {
  userId: string;
  type: "bank_card" | "sbp";
  purpose: string;
  returnUrl: string;
}): Promise<{ methodId: string; confirmationUrl: string }> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const res = await yooFetch("https://api.yookassa.ru/v3/payment_methods", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify({
      type: input.type,
      confirmation: { type: "redirect", return_url: input.returnUrl },
      metadata: { user_id: input.userId, purpose: input.purpose },
    }),
  });
  const data = (await res.json()) as YooMethod & {
    confirmation?: { confirmation_url?: string };
    description?: string;
  };
  if (!res.ok || !data.id || !data.confirmation?.confirmation_url) {
    throw new Error(data.description || "YOOKASSA_BIND_FAILED");
  }
  return { methodId: data.id, confirmationUrl: data.confirmation.confirmation_url };
}

export async function fetchYooKassaPaymentMethod(methodId: string): Promise<YooMethod> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");
  const res = await yooFetch(`https://api.yookassa.ru/v3/payment_methods/${methodId}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  const data = (await res.json()) as YooMethod & { description?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.description || "YOOKASSA_METHOD_FETCH_FAILED");
  }
  return data;
}

export async function createRecurringYooKassaPayment(input: {
  userId: string;
  userEmail: string;
  tier: "basic" | "pro";
  amountRub: number;
  interval: BillingInterval;
  paymentMethodId: string;
  idempotenceKey: string;
}): Promise<YooPayment> {
  if (!yookassaConfigured()) throw new Error("YOOKASSA_NOT_CONFIGURED");

  const localPaymentId = await insertPendingBillingPayment(
    input.userId,
    input.tier,
    input.amountRub,
    input.interval
  );

  const body: Record<string, unknown> = {
    amount: { value: input.amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    payment_method_id: input.paymentMethodId,
    description: `BackTest Pro — ${tierLabel(input.tier)}`,
    metadata: {
      user_id: input.userId,
      tier: input.tier,
      billing_interval: input.interval,
    },
  };

  attachReceipt(
    body,
    input.userEmail,
    `Подписка ${tierLabel(input.tier)} BackTest Pro`,
    input.amountRub
  );

  const res = await yooFetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as YooPayment & { description?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.description || "YOOKASSA_RECURRING_FAILED");
  }
  await attachYooPaymentId(localPaymentId, data.id);
  return data;
}
