export function yookassaConfigured(): boolean {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim()
  );
}

export function yookassaReturnUrl(localPaymentId?: string): string {
  const base =
    process.env.YOOKASSA_RETURN_URL?.trim() ||
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
