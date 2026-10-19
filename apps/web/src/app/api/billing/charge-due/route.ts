import { NextRequest, NextResponse } from "next/server";
import { chargeAllDue } from "@/lib/chargeDue";

export const dynamic = "force-dynamic";

/** Планировщик: POST с заголовком x-billing-cron = BILLING_CRON_SECRET. */
export async function POST(req: NextRequest) {
  const secret = process.env.BILLING_CRON_SECRET?.trim();
  const header = req.headers.get("x-billing-cron")?.trim();
  const devOpen = process.env.NODE_ENV !== "production" && !secret;
  if (!devOpen && (!secret || header !== secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const charged = await chargeAllDue();
    return NextResponse.json({ ok: true, charged });
  } catch (err) {
    console.error("[charge-due]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
