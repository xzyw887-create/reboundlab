import { NextResponse } from "next/server";
import { resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson } from "@/lib/auth";
import { devLocalAuthAllowed, loginOrCreateDevLocalUser } from "@/lib/devLocalAuth";

function isLoopbackHost(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").split(":")[0]?.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export async function POST(req: Request) {
  const locale = localeFromRequest(req);

  if (!devLocalAuthAllowed() || !isLoopbackHost(req)) {
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
