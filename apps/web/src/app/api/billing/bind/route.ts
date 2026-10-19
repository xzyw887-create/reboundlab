import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { getAuthUser } from "@/lib/auth";
import { activateBoundMethod } from "@/lib/autopay";
import { insertPendingPaymentMethod } from "@/lib/autopay";
import { createYooKassaPaymentMethod } from "@/lib/yookassaClient";
import { checkoutStubAllowed, yookassaBindReturnUrl, yookassaConfigured } from "@/lib/yookassaConfig";

export const dynamic = "force-dynamic";

/** Привязка карты или СБП без списания: пробные сутки или сохранение метода на уже оплаченный период. */
export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: apiMessage(locale, "LOGIN_REQUIRED") }, { status: 401 });
    }

    const body = (await req.json()) as { method?: string; purpose?: string };
    const method = body.method === "sbp" ? "sbp" : body.method === "bank_card" ? "bank_card" : null;
    const purpose = body.purpose === "keep" ? "keep" : body.purpose === "trial" ? "trial" : null;
    if (!method || !purpose) {
      return NextResponse.json({ error: apiMessage(locale, "INVALID_REQUEST") }, { status: 400 });
    }
    if (purpose === "trial" && user.trialStarted) {
      return NextResponse.json({ error: apiMessage(locale, "TRIAL_ALREADY_CLAIMED") }, { status: 400 });
    }
    if (purpose === "keep" && (user.trialExpired || user.subscriptionExpired)) {
      return NextResponse.json({ error: apiMessage(locale, "SUBSCRIPTION_EXPIRED") }, { status: 400 });
    }

    if (yookassaConfigured()) {
      const created = await createYooKassaPaymentMethod({
        userId: user.id,
        type: method,
        purpose,
        returnUrl: yookassaBindReturnUrl(),
      });
      await insertPendingPaymentMethod(user.id, {
        externalId: created.methodId,
        type: method,
        title: null,
        purpose,
      });
      return NextResponse.json({
        confirmationUrl: created.confirmationUrl,
        methodId: created.methodId,
      });
    }

    if (!checkoutStubAllowed()) {
      return NextResponse.json(
        { error: apiMessage(locale, "PAYMENT_PROVIDER_REQUIRED") },
        { status: 403 }
      );
    }

    await activateBoundMethod(user.id, {
      externalId: `local-${user.id}`,
      type: "local",
      title: "Тестовая привязка",
      purpose,
    });
    return NextResponse.json({ ok: true, local: true });
  } catch (err) {
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status: 400 });
  }
}
