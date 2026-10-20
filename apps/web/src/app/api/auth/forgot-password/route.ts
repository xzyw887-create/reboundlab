import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { createPasswordResetToken, parseReceiptEmail, passwordResetUrl } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/sendEmail";

/** Письмо на почту из регистрации. Вход на сайт остаётся через Telegram. */
export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const body = await req.json();
    const email = parseReceiptEmail(body?.email);
    if (!email) {
      return NextResponse.json(
        { error: apiMessage(locale, "RECEIPT_EMAIL_REQUIRED") },
        { status: 400 }
      );
    }
    const token = await createPasswordResetToken(email);
    if (token) {
      await sendPasswordResetEmail(email, passwordResetUrl(token));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.code === "INVALID_EMAIL" || err.code === "DISPOSABLE_EMAIL" || err.code === "RECEIPT_EMAIL_REQUIRED")
    ) {
      return NextResponse.json({ error: apiMessage(locale, err.code) }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
}
