import { NextResponse } from "next/server";
import { startBillingScheduler } from "@/lib/billingScheduler";

export async function GET() {
  startBillingScheduler();
  return NextResponse.json({
    ok: true,
    port: process.env.PORT ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
