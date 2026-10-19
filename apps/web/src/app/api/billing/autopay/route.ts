import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson, getAuthUser } from "@/lib/auth";
import { cancelAutopay, unlinkPaymentMethod } from "@/lib/autopay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: apiMessage(locale, "LOGIN_REQUIRED") }, { status: 401 });
    }
    const body = (await req.json()) as { action?: string };
    if (body.action === "cancel") {
      await cancelAutopay(user.id);
    } else if (body.action === "unlink") {
      await unlinkPaymentMethod(user.id);
    } else {
      return NextResponse.json({ error: apiMessage(locale, "INVALID_REQUEST") }, { status: 400 });
    }
    const updated = await getAuthUser();
    if (!updated) {
      return NextResponse.json({ error: apiMessage(locale, "ACCOUNT_UPDATE_FAILED") }, { status: 500 });
    }
    return NextResponse.json({ ok: true, user: authUserJson(updated) });
  } catch (err) {
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status: 400 });
  }
}
