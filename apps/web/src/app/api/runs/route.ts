import { NextRequest, NextResponse } from "next/server";
import { apiMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { getAuthUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureUserRunsSchema } from "@/lib/ensureUserRunsSchema";
import type { BacktestParams } from "@/lib/types";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserRunsSchema();
    const rows = await query<{
      id: string;
      label: string;
      params: BacktestParams;
      summary: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, label, params, summary, created_at
       FROM core.backtest_runs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    return NextResponse.json({
      runs: rows.map((r) => ({
        id: r.id,
        label: r.label,
        params: r.params,
        summary: r.summary,
        created_at: r.created_at.toISOString(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    if (msg.includes("backtest_runs")) {
      return NextResponse.json({ runs: [], migrationRequired: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: apiMessage(locale, "UNAUTHORIZED") }, { status: 401 });
  }

  const body = await req.json();
  const params = body.params as BacktestParams;
  const summary = body.summary as Record<string, unknown>;
  if (!params || !summary) {
    return NextResponse.json({ error: apiMessage(locale, "INVALID_PAYLOAD") }, { status: 400 });
  }

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 200)
      : "";

  try {
    await ensureUserRunsSchema();
    const rows = await query<{ id: string; created_at: Date }>(
      `INSERT INTO core.backtest_runs (user_id, label, params, summary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [user.id, label, JSON.stringify(params), JSON.stringify(summary)]
    );
    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      created_at: row.created_at.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const locale = localeFromRequest(req);
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: apiMessage(locale, "UNAUTHORIZED") }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: apiMessage(locale, "MISSING_ID") }, { status: 400 });
  }

  try {
    await ensureUserRunsSchema();
    await query(`DELETE FROM core.backtest_runs WHERE id = $1 AND user_id = $2`, [
      id,
      user.id,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
