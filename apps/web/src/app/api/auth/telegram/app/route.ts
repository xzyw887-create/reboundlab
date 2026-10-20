import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import { authUserJson, loginOrRegisterViaTelegram, userExistsByTelegramId } from "@/lib/auth";
import {
  assertDeviceMayRegister,
  linkDeviceToUser,
  SIGNUP_DEVICE_COOKIE,
} from "@/lib/signupGuard";
import { startTelegramAppLogin, takeApprovedTelegramAppLogin } from "@/lib/telegramAppLogin";
import type { TelegramWidgetAuth } from "@/lib/telegramLogin";

export const dynamic = "force-dynamic";

function tokenOf(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const token = (body as { token?: unknown }).token;
  return typeof token === "string" ? token : "";
}

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);
  try {
    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: unknown }).action;
    if (action === "start") {
      const started = await startTelegramAppLogin();
      return NextResponse.json(started);
    }

    const approved = await takeApprovedTelegramAppLogin(tokenOf(body));
    if (!approved) {
      return NextResponse.json({ pending: true });
    }

    const payload: TelegramWidgetAuth = {
      id: approved.id,
      auth_date: Math.floor(Date.now() / 1000),
      hash: "app",
      first_name: approved.firstName ?? undefined,
      last_name: approved.lastName ?? undefined,
      username: approved.username ?? undefined,
    };

    const deviceId = req.cookies.get(SIGNUP_DEVICE_COOKIE)?.value;
    const exists = await userExistsByTelegramId(payload.id);
    if (!exists) {
      await assertDeviceMayRegister(deviceId);
    }

    const { user, isNew } = await loginOrRegisterViaTelegram(payload);
    if (isNew) {
      await linkDeviceToUser(deviceId, user.id);
    }
    return NextResponse.json({ pending: false, user: authUserJson(user), isNew });
  } catch (err) {
    return NextResponse.json({ error: resolveErrorMessage(locale, err) }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: apiMessage("ru", "INVALID_REQUEST") }, { status: 405 });
}
