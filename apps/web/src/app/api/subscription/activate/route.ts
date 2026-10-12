import { NextRequest, NextResponse } from "next/server";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson, getAuthUser } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscriptionActivate";
import { checkoutStubAllowed } from "@/lib/yookassaConfig";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    if (!checkoutStubAllowed()) {
      return NextResponse.json(
        { error: apiMessage(locale, "PAYMENT_PROVIDER_REQUIRED") },
        { status: 403 }
      );
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: apiMessage(locale, "LOGIN_REQUIRED") },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { tier?: PlanTier };
    const tier = body.tier;
    if (!tier || (tier !== "basic" && tier !== "pro")) {
      return NextResponse.json(
        { error: apiMessage(locale, "INVALID_TIER") },
        { status: 400 }
      );
    }

    await activateSubscription(user.id, tier);
    const updated = await getAuthUser();
    if (!updated) {
      return NextResponse.json(
        { error: apiMessage(locale, "ACCOUNT_UPDATE_FAILED") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: authUserJson(updated),
    });
  } catch (err) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
