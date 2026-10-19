import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { getAuthUser } from "@/lib/auth";
import { completeUserBind } from "@/lib/completeBind";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: apiMessage(locale, "LOGIN_REQUIRED") }, { status: 401 });
    }
    const methodId = req.nextUrl.searchParams.get("id");
    const result = await completeUserBind(user.id, methodId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status: 400 });
  }
}
