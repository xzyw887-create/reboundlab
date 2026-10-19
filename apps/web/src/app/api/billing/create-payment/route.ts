import { NextRequest, NextResponse } from "next/server";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { getAuthUser } from "@/lib/auth";
import { quoteCheckoutAmount } from "@/lib/billingCheckoutAmount";
import { parseBillingInterval } from "@/lib/billingInterval";
import { confirmPreviewCheckout } from "@/lib/flowPreviewCheckout";
import { createYooKassaPayment } from "@/lib/yookassaClient";
import { yookassaConfigured } from "@/lib/yookassaConfig";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: apiMessage(locale, "LOGIN_REQUIRED") },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { tier?: PlanTier; interval?: string };
    const tier = body.tier;
    if (tier !== "basic" && tier !== "pro") {
      return NextResponse.json(
        { error: apiMessage(locale, "INVALID_TIER") },
        { status: 400 }
      );
    }

    if (user.flowPreview) {
      await confirmPreviewCheckout(user.id, tier, parseBillingInterval(body.interval));
      return NextResponse.json({ ok: true, preview: true });
    }

    if (!yookassaConfigured()) {
      return NextResponse.json(
        { error: apiMessage(locale, "PAYMENT_PROVIDER_REQUIRED") },
        { status: 503 }
      );
    }

    const quote = quoteCheckoutAmount(user, tier, body.interval);
    const result = await createYooKassaPayment(user.id, user.email, tier, quote);

    return NextResponse.json({
      ok: true,
      paymentId: result.localPaymentId,
      confirmationUrl: result.confirmationUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
