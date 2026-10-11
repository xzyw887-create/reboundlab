import { NextRequest, NextResponse } from "next/server";
import { apiMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  return NextResponse.json(
    { error: apiMessage(locale, "EMAIL_AUTH_DISABLED") },
    { status: 403 }
  );
}
