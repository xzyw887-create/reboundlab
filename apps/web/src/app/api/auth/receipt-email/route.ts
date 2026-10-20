import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson, getAuthUser, setReceiptEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: apiMessage(locale, "LOGIN_REQUIRED") }, { status: 401 });
    }
    const body = await req.json();
    await setReceiptEmail(user.id, body?.email);
    const fresh = await getAuthUser();
    if (!fresh) {
      return NextResponse.json({ error: apiMessage(locale, "LOGIN_FAILED") }, { status: 400 });
    }
    return NextResponse.json({ user: authUserJson(fresh) });
  } catch (err) {
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status: 400 });
  }
}
