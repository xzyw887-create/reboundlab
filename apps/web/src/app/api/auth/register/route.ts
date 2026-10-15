import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson, registerUser } from "@/lib/auth";
import { emailPasswordAuthEnabled } from "@/lib/emailPasswordAuth";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  if (!emailPasswordAuthEnabled()) {
    return NextResponse.json(
      { error: apiMessage(locale, "EMAIL_AUTH_DISABLED") },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const user = await registerUser(email, password);
    return NextResponse.json({ user: authUserJson(user) });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      return NextResponse.json(
        { error: apiMessage(locale, "EMAIL_ALREADY_REGISTERED") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
