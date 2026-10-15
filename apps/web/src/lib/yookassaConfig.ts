type YookassaEnvKey =
  | "YOOKASSA_SHOP_ID"
  | "YOOKASSA_SECRET_KEY"
  | "YOOKASSA_RETURN_URL"
  | "YOOKASSA_SEND_RECEIPT";

/** Runtime env (Docker): bracket access so Next build does not bake empty values. */
function billingEnv(name: YookassaEnvKey): string | undefined {
  return process.env[name];
}

export function yookassaConfigured(): boolean {
  return Boolean(
    billingEnv("YOOKASSA_SHOP_ID")?.trim() && billingEnv("YOOKASSA_SECRET_KEY")?.trim()
  );
}

export function yookassaSendReceiptEnabled(): boolean {
  return billingEnv("YOOKASSA_SEND_RECEIPT") === "1";
}

export function yookassaCredentials(): { shopId: string; secret: string } | null {
  const shopId = billingEnv("YOOKASSA_SHOP_ID")?.trim();
  const secret = billingEnv("YOOKASSA_SECRET_KEY")?.trim();
  if (!shopId || !secret) return null;
  return { shopId, secret };
}

export function yookassaReturnUrl(localPaymentId?: string): string {
  const base =
    billingEnv("YOOKASSA_RETURN_URL")?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`;
  const u = new URL(base.includes("://") ? base : `https://${base}`);
  u.searchParams.set("payment", "return");
  if (localPaymentId) {
    u.searchParams.set("id", localPaymentId);
  }
  return u.toString();
}

/** Прямая активация без оплаты (только dev / явный флаг). */
export function checkoutStubAllowed(): boolean {
  if (process.env.ALLOW_CHECKOUT_STUB === "1") return true;
  if (yookassaConfigured()) return false;
  return process.env.NODE_ENV !== "production";
}
