import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    port: process.env.PORT ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
