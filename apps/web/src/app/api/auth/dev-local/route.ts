import { NextResponse } from "next/server";
import { resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson } from "@/lib/auth";
import { devLocalAuthAllowed, loginOrCreateDevLocalUser } from "@/lib/devLocalAuth";

export async function POST(req: Request) {
  const locale = localeFromRequest(req);

  if (!devLocalAuthAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const user = await loginOrCreateDevLocalUser();
    return NextResponse.json({ user: authUserJson(user) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
