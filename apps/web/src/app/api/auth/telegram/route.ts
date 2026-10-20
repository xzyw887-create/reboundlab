import { NextRequest, NextResponse } from "next/server";
import { apiMessage, resolveErrorMessage } from "@/lib/apiErrors";
import { localeFromRequest } from "@/lib/apiLocale";
import {
  authUserJson,
  loginOrRegisterViaTelegram,
  userExistsByTelegramId,
} from "@/lib/auth";
import {
  assertDeviceMayRegister,
  linkDeviceToUser,
  SIGNUP_DEVICE_COOKIE,
} from "@/lib/signupGuard";
import { verifyTelegramWidgetAuth, type TelegramWidgetAuth } from "@/lib/telegramLogin";

function parsePayload(body: unknown): TelegramWidgetAuth | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const id = Number(b.id);
  const auth_date = Number(b.auth_date);
  const hash = typeof b.hash === "string" ? b.hash : "";
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(auth_date) || !hash) {
    return null;
  }
  return {
    id,
    auth_date,
    hash,
    first_name: typeof b.first_name === "string" ? b.first_name : undefined,
    last_name: typeof b.last_name === "string" ? b.last_name : undefined,
    username: typeof b.username === "string" ? b.username : undefined,
    photo_url: typeof b.photo_url === "string" ? b.photo_url : undefined,
  };
}

export async function POST(req: NextRequest) {
  const locale = localeFromRequest(req);

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { error: apiMessage(locale, "TELEGRAM_NOT_CONFIGURED") },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const payload = parsePayload(body);
    const receiptEmail =
      body && typeof body === "object" ? (body as { email?: unknown }).email : undefined;
    if (!payload || !verifyTelegramWidgetAuth(payload)) {
      return NextResponse.json(
        { error: apiMessage(locale, "TELEGRAM_AUTH_INVALID") },
        { status: 401 }
      );
    }

    const deviceId = req.cookies.get(SIGNUP_DEVICE_COOKIE)?.value;
    const exists = await userExistsByTelegramId(payload.id);
    if (!exists) {
      await assertDeviceMayRegister(deviceId);
    }

    const { user, isNew } = await loginOrRegisterViaTelegram(payload, receiptEmail);
    if (isNew) {
      await linkDeviceToUser(deviceId, user.id);
    }

    return NextResponse.json({ user: authUserJson(user), isNew });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: resolveErrorMessage(locale, err) },
      { status: 400 }
    );
  }
}
