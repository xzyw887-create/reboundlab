import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { getAuthUser } from "@/lib/auth";
import { findPaymentForUser } from "@/lib/billingPayments";
import { fulfillYooKassaPayment } from "@/lib/fulfillPayment";

/** GET ?id=<local billing_payments.id> — статус после return_url / polling */
export async function GET(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: apiMessage(locale, "LOGIN_REQUIRED") },
        { status: 401 }
      );
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { error: apiMessage(locale, "MISSING_ID") },
        { status: 400 }
      );
    }

    let row = await findPaymentForUser(id, user.id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!row.activated_at && row.yookassa_payment_id) {
      try {
        await fulfillYooKassaPayment(row.yookassa_payment_id);
      } catch {
        /* still pending on provider */
      }
      row = (await findPaymentForUser(id, user.id)) ?? row;
    }

    return NextResponse.json({
      status: row.status,
      activated: Boolean(row.activated_at),
      tier: row.tier,
      amountRub: row.amount_rub,
    });
  } catch (err) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
