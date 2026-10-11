import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { resetPasswordWithToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  const body = await req.json();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !password) {
    return NextResponse.json({ error: apiMessage(locale, "INVALID_REQUEST") }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(token, password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, e) },
      { status: 400 }
    );
  }
}
