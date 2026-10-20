import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate, telegramWebhookSecret } from "@/lib/telegramBot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== telegramWebhookSecret(token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const update = (await req.json()) as Parameters<typeof handleTelegramUpdate>[0];
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram-bot]", err);
  }
  return NextResponse.json({ ok: true });
}
