import { NextRequest, NextResponse } from "next/server";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { attachStubAutopay } from "@/lib/autopay";
import { authUserJson, getAuthUser } from "@/lib/auth";
import { chargeRubForTier } from "@/lib/billingCharge";
import { annualChargeRubFromCatalogMonthly, parseBillingInterval } from "@/lib/billingInterval";
import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";
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

    const body = (await req.json()) as { tier?: PlanTier; interval?: string };
    const tier = body.tier;
    const interval = parseBillingInterval(body.interval);
    if (!tier || (tier !== "basic" && tier !== "pro")) {
      return NextResponse.json(
        { error: apiMessage(locale, "INVALID_TIER") },
        { status: 400 }
      );
    }

    const devTester = isDevLocalTesterAccount(user.email);
    const activated = await activateSubscription(user.id, tier, {
      interval,
      devTesterForce: devTester,
    });
    if (!devTester) {
      const monthly = chargeRubForTier(tier);
      await attachStubAutopay(
        user.id,
        tier,
        interval,
        activated.expiresAt,
        interval === "year" ? annualChargeRubFromCatalogMonthly(monthly) : monthly
      );
    }

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
