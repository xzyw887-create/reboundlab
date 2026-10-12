import { NextRequest, NextResponse } from "next/server";
import { adminApiConfigured, assertAdminRequest } from "@/lib/adminAuth";
import {
  adminGrantSubscription,
  adminUserJson,
  eraseUserAccount,
  findUserForAdmin,
  type GrantPlan,
} from "@/lib/adminUserOps";
import { ApiError, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";

function adminDisabled() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** GET ?q=uuid | telegram_id — карточка пользователя */
export async function GET(req: NextRequest) {
  if (!adminApiConfigured()) return adminDisabled();
  const locale = localeFromRequest(req);
  try {
    assertAdminRequest(req);
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "Missing q" }, { status: 400 });
    }
    const row = await findUserForAdmin(q);
    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: adminUserJson(row) });
  } catch (err) {
    const status =
      err instanceof ApiError && err.code === "UNAUTHORIZED"
        ? 401
        : err instanceof Error && err.message === "INVALID_LOOKUP"
          ? 400
          : 400;
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status });
  }
}

/** DELETE { "userId": "uuid", "releaseTelegramTrial": false } */
export async function DELETE(req: NextRequest) {
  if (!adminApiConfigured()) return adminDisabled();
  const locale = localeFromRequest(req);
  try {
    assertAdminRequest(req);
    const body = (await req.json()) as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const result = await eraseUserAccount(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const status = msg === "USER_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status }
    );
  }
}

/** POST { "userId", "plan": "trial"|"basic"|"pro", "days": 30 } — подарок / продление */
export async function POST(req: NextRequest) {
  if (!adminApiConfigured()) return adminDisabled();
  const locale = localeFromRequest(req);
  try {
    assertAdminRequest(req);
    const body = (await req.json()) as {
      userId?: string;
      plan?: GrantPlan;
      days?: number;
    };
    const userId = body.userId?.trim();
    const plan = body.plan;
    const days = Number(body.days);
    if (!userId || !plan || !["trial", "basic", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = await adminGrantSubscription(userId, plan, days || 30);
    const row = await findUserForAdmin(userId);
    return NextResponse.json({
      ok: true,
      grant: result,
      user: row ? adminUserJson(row) : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const status =
      msg === "SUBSCRIPTION_NOT_FOUND" || msg === "USER_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status }
    );
  }
}
