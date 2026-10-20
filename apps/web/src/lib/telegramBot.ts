import { createHash } from "crypto";
import { createPasswordResetToken, passwordResetUrl } from "@/lib/auth";
import { query } from "@/lib/db";
import { isTelegramPlaceholderEmail } from "@/lib/telegramIdentity";
import { TELEGRAM_URL } from "@/lib/supportContact";

type TgMessage = {
  text?: string;
  chat?: { id?: number };
  from?: { id?: number };
};

type TgUpdate = {
  message?: TgMessage;
};

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function telegramWebhookSecret(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

async function telegramApi(method: string, body: Record<string, unknown>): Promise<void> {
  const token = botToken();
  if (!token) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`telegram ${method} ${res.status} ${text.slice(0, 180)}`);
  }
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await telegramApi("sendMessage", { chat_id: chatId, text });
}

export async function ensureTelegramWebhook(): Promise<void> {
  const g = globalThis as { __btpTelegramWebhook?: boolean };
  if (g.__btpTelegramWebhook) return;
  const token = botToken();
  if (!token) return;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://backtestpro.ru").replace(/\/$/, "");
  await telegramApi("setWebhook", {
    url: `${base}/api/telegram/webhook`,
    secret_token: telegramWebhookSecret(token),
    allowed_updates: ["message"],
  });
  g.__btpTelegramWebhook = true;
}

function commandOf(text: string): string {
  return text.trim().split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";
}

async function replyReset(chatId: number, telegramId: number): Promise<void> {
  const rows = await query<{ email: string; password_hash: string | null }>(
    `SELECT email, password_hash FROM core.users
     WHERE telegram_id = $1 AND status = 'active'
     LIMIT 1`,
    [telegramId]
  );
  const user = rows[0];
  if (!user || !user.password_hash || isTelegramPlaceholderEmail(user.email)) {
    await sendTelegramMessage(
      chatId,
      "Отдельный пароль не используется. Вход на сайт — кнопкой Telegram на backtestpro.ru."
    );
    return;
  }
  const token = await createPasswordResetToken(user.email);
  if (!token) {
    await sendTelegramMessage(chatId, "Не удалось подготовить ссылку. Напишите в этот чат ещё раз.");
    return;
  }
  await sendTelegramMessage(
    chatId,
    `Ссылка для нового пароля, действует один час:\n${passwordResetUrl(token)}`
  );
}

export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  const message = update.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = message?.text ?? "";
  if (!chatId || !fromId || !text) return;

  const command = commandOf(text);
  if (command === "/start") {
    const known = await query<{ id: string }>(
      `SELECT id FROM core.users WHERE telegram_id = $1 AND status = 'active' LIMIT 1`,
      [fromId]
    );
    if (!known[0]) {
      await sendTelegramMessage(
        chatId,
        "Сначала войдите на backtestpro.ru кнопкой Telegram, затем снова нажмите Start здесь."
      );
      return;
    }
    await sendTelegramMessage(
      chatId,
      "Аккаунт подтверждён. Чеки об оплате приходят в этот чат. Вход на сайт — кнопкой Telegram. Сброс старого пароля: /reset."
    );
    return;
  }

  if (command === "/reset" || text.trim().toLowerCase() === "пароль") {
    await replyReset(chatId, fromId);
  }
}

export async function sendPaymentReceipt(
  userId: string,
  tier: "basic" | "pro",
  amountRub: number
): Promise<void> {
  const rows = await query<{ telegram_id: string | null }>(
    `SELECT telegram_id FROM core.users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const telegramId = rows[0]?.telegram_id;
  if (!telegramId) return;
  const plan = tier === "pro" ? "Про" : "Базовый";
  const rub = new Intl.NumberFormat("ru-RU").format(amountRub);
  await sendTelegramMessage(
    Number(telegramId),
    `Чек BackTest Pro\nТариф: ${plan}\nСумма: ${rub} ₽\nОплата прошла. Если сообщения не приходили раньше, откройте ${TELEGRAM_URL} и нажмите Start.`
  );
}
