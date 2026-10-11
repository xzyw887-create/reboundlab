import { NextResponse } from "next/server";
import { getMarketLandingStats } from "@/lib/marketLandingStats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getMarketLandingStats();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
