import { createHash } from "crypto";
import { cancelAutopay, enableAutopay, endSubscriptionNow } from "@/lib/autopay";
import { chargeRubForTier } from "@/lib/billingCharge";
import type { BillingInterval } from "@/lib/billingInterval";
import { query } from "@/lib/db";
import { approveTelegramAppLogin } from "@/lib/telegramAppLogin";

type TgChat = { id?: number; type?: string };
type TgUser = { id?: number; username?: string; first_name?: string; last_name?: string };
type TgMessage = {
  text?: string;
  chat?: TgChat;
  from?: TgUser;
  message_id?: number;
};
type TgCallback = {
  id: string;
  data?: string;
  from?: TgUser;
  message?: { chat?: TgChat; message_id?: number };
};
type TgUpdate = {
  message?: TgMessage;
  callback_query?: TgCallback;
};

type Markup = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };

type AccountRow = {
  id: string;
  tier: string;
  expires_at: Date | null;
  autopay_enabled: boolean;
  autopay_interval: string | null;
  has_card: boolean;
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://backtestpro.ru").replace(/\/$/, "");
}

function terminalUrl(): string {
  return `${siteBase()}/app`;
}

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function telegramWebhookSecret(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

function communityChatUrl(): string {
  const fromEnv =
    process.env.TELEGRAM_COMMUNITY_URL?.trim() || process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim();
  return fromEnv || "https://t.me/backtestpro_help";
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
    if (text.includes("message is not modified")) return;
    throw new Error(`telegram ${method} ${res.status} ${text.slice(0, 180)}`);
  }
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Markup
): Promise<void> {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

async function showScreen(
  chatId: number,
  messageId: number | undefined,
  text: string,
  replyMarkup: Markup
): Promise<void> {
  if (messageId) {
    try {
      await telegramApi("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
        reply_markup: replyMarkup,
      });
      return;
    } catch (err) {
      console.error("[telegram-bot]", err);
    }
  }
  await sendTelegramMessage(chatId, text, replyMarkup);
}

function mainMenu(): Markup {
  return {
    inline_keyboard: [
      [{ text: "Подписка", callback_data: "sub" }],
      [{ text: "Терминал", url: terminalUrl() }],
      [{ text: "BackTestPro|Help", url: communityChatUrl() }],
    ],
  };
}

function planName(tier: string): string {
  if (tier === "pro") return "Про";
  if (tier === "basic" || tier === "starter") return "Базовый";
  if (tier === "automatic") return "Автоматический";
  return "Пробный";
}

function formatWhen(value: Date | null): string {
  if (!value) return "без даты окончания";
  return value.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });
}

async function loadAccount(telegramId: number): Promise<AccountRow | null> {
  const rows = await query<AccountRow>(
    `SELECT u.id, p.tier, s.expires_at, s.autopay_enabled,
            s.autopay_interval,
            EXISTS (
              SELECT 1 FROM core.saved_payment_methods m
              WHERE m.user_id = u.id AND m.status = 'active'
            ) AS has_card
     FROM core.users u
     JOIN core.subscriptions s ON s.user_id = u.id
     JOIN core.plans p ON p.id = s.plan_id
     WHERE u.telegram_id = $1 AND u.status = 'active'
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [telegramId]
  );
  return rows[0] ?? null;
}

function subscriptionText(account: AccountRow): string {
  const live = account.expires_at != null && account.expires_at.getTime() > Date.now();
  const renew = account.autopay_enabled ? "включено" : "выключено";
  const access = live ? "открыт" : "закрыт";
  return [
    `Тариф: ${planName(account.tier)}`,
    `Доступ: ${access} до ${formatWhen(account.expires_at)}`,
    `Продление: ${renew}`,
    account.has_card ? "Карта привязана." : "Карта не привязана.",
  ].join("\n");
}

function subscriptionMenu(account: AccountRow): Markup {
  const rows: Markup["inline_keyboard"] = [];
  const live = account.expires_at != null && account.expires_at.getTime() > Date.now();
  if (account.autopay_enabled) {
    rows.push([{ text: "Выключить продление", callback_data: "renew_off" }]);
  } else if (live && account.has_card) {
    rows.push([{ text: "Включить продление", callback_data: "renew_on" }]);
  }
  if (live) {
    rows.push([{ text: "Отменить подписку", callback_data: "cancel_ask" }]);
  }
  rows.push([{ text: "Назад", callback_data: "menu" }]);
  return { inline_keyboard: rows };
}

async function openSubscription(chatId: number, telegramId: number, messageId?: number): Promise<void> {
  const account = await loadAccount(telegramId);
  if (!account) {
    await showScreen(
      chatId,
      messageId,
      "Сначала войдите на backtestpro.ru кнопкой Telegram, затем откройте это меню снова.",
      mainMenu()
    );
    return;
  }
  await showScreen(chatId, messageId, subscriptionText(account), subscriptionMenu(account));
}

async function turnRenewalOff(chatId: number, telegramId: number, messageId?: number): Promise<void> {
  const account = await loadAccount(telegramId);
  if (!account) return;
  await cancelAutopay(account.id);
  const next = await loadAccount(telegramId);
  await showScreen(
    chatId,
    messageId,
    `Продление выключено. Оплаченный срок сохранится.\n\n${next ? subscriptionText(next) : ""}`.trim(),
    next ? subscriptionMenu(next) : mainMenu()
  );
}

async function turnRenewalOn(chatId: number, telegramId: number, messageId?: number): Promise<void> {
  const account = await loadAccount(telegramId);
  if (!account?.expires_at || account.expires_at.getTime() <= Date.now() || !account.has_card) {
    await showScreen(
      chatId,
      messageId,
      "Продление включается, когда срок ещё идёт и карта привязана. Карту привязывают на сайте при оплате.",
      account ? subscriptionMenu(account) : mainMenu()
    );
    return;
  }
  const tier = account.tier === "pro" ? "pro" : "basic";
  const interval: BillingInterval = account.autopay_interval === "year" ? "year" : "month";
  await enableAutopay(account.id, {
    tier,
    interval,
    amountRub: chargeRubForTier(tier),
    nextChargeAt: account.expires_at.toISOString(),
  });
  const next = await loadAccount(telegramId);
  await showScreen(
    chatId,
    messageId,
    `Продление включено. Списание будет в конце текущего срока.\n\n${next ? subscriptionText(next) : ""}`.trim(),
    next ? subscriptionMenu(next) : mainMenu()
  );
}

async function askCancel(chatId: number, messageId?: number): Promise<void> {
  await showScreen(
    chatId,
    messageId,
    "Подписка закроется сразу, карта отвяжется, терминал станет недоступен. Это не отменить.",
    {
      inline_keyboard: [
        [{ text: "Да, отменить подписку", callback_data: "cancel_yes" }],
        [{ text: "Оставить", callback_data: "sub" }],
      ],
    }
  );
}

async function confirmCancel(chatId: number, telegramId: number, messageId?: number): Promise<void> {
  const account = await loadAccount(telegramId);
  if (!account) return;
  await endSubscriptionNow(account.id);
  await showScreen(
    chatId,
    messageId,
    "Подписка отменена. Срок закрыт, карта отвязана.",
    mainMenu()
  );
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
    allowed_updates: ["message", "callback_query"],
  });
  await telegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "Меню" },
      { command: "subscription", description: "Подписка и продление" },
      { command: "chat", description: "BackTestPro|Help" },
    ],
  });
  await telegramApi("setMyShortDescription", {
    short_description: "Подписка, чеки и чат BackTest Pro",
  });
  g.__btpTelegramWebhook = true;
}

function commandOf(text: string): string {
  return text.trim().split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";
}

async function confirmAppLogin(
  chatId: number,
  from: TgUser,
  payload: string
): Promise<void> {
  const token = payload.startsWith("login_") ? payload.slice("login_".length) : "";
  const telegramId = from.id;
  if (!telegramId || !token) {
    await sendTelegramMessage(chatId, "Ссылка входа неполная. Нажмите кнопку на сайте ещё раз.");
    return;
  }
  const result = await approveTelegramAppLogin(token, {
    id: telegramId,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
  });
  if (result !== "ok") {
    await sendTelegramMessage(
      chatId,
      "Ссылка входа устарела. Вернитесь на сайт и нажмите кнопку ещё раз."
    );
    return;
  }
  await sendTelegramMessage(
    chatId,
    "Вход подтверждён. Вернитесь в браузер — сайт сам продолжит.",
    mainMenu()
  );
}

async function onCommand(
  chatId: number,
  from: TgUser,
  command: string,
  payload: string
): Promise<void> {
  const telegramId = from.id;
  if (!telegramId) return;
  if (command === "/start" && payload.startsWith("login_")) {
    await confirmAppLogin(chatId, from, payload);
    return;
  }
  if (command === "/start" || command === "/menu") {
    const account = await loadAccount(telegramId);
    await sendTelegramMessage(
      chatId,
      account
        ? "Чеки об оплате приходят сюда. Подписка, терминал и чат — в кнопках ниже."
        : "Сначала войдите на backtestpro.ru кнопкой Telegram, затем снова нажмите Start.",
      mainMenu()
    );
    return;
  }
  if (command === "/subscription" || command === "/sub") {
    await openSubscription(chatId, telegramId);
    return;
  }
  if (command === "/chat") {
    await sendTelegramMessage(chatId, `Чат участников BackTestPro|Help:\n${communityChatUrl()}`, mainMenu());
  }
}

async function onCallback(callback: TgCallback): Promise<void> {
  const chatId = callback.message?.chat?.id;
  const telegramId = callback.from?.id;
  const data = callback.data ?? "";
  if (!chatId || !telegramId) return;
  await telegramApi("answerCallbackQuery", { callback_query_id: callback.id }).catch((err) => {
    console.error("[telegram-bot]", err);
  });
  const messageId = callback.message?.message_id;
  if (data === "menu") {
    await showScreen(chatId, messageId, "Меню BackTest Pro", mainMenu());
    return;
  }
  if (data === "sub") {
    await openSubscription(chatId, telegramId, messageId);
    return;
  }
  if (data === "renew_off") {
    await turnRenewalOff(chatId, telegramId, messageId);
    return;
  }
  if (data === "renew_on") {
    await turnRenewalOn(chatId, telegramId, messageId);
    return;
  }
  if (data === "cancel_ask") {
    await askCancel(chatId, messageId);
    return;
  }
  if (data === "cancel_yes") {
    await confirmCancel(chatId, telegramId, messageId);
  }
}

export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    if (update.callback_query.message?.chat?.type && update.callback_query.message.chat.type !== "private") {
      return;
    }
    await onCallback(update.callback_query);
    return;
  }
  const message = update.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = message?.text ?? "";
  if (!chatId || !fromId || !text) return;
  if (message?.chat?.type && message.chat.type !== "private") return;
  const command = commandOf(text);
  if (command.startsWith("/")) {
    const payload = text.trim().split(/\s+/).slice(1).join(" ");
    await onCommand(chatId, message.from ?? { id: fromId }, command, payload);
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
    `Чек BackTest Pro\nТариф: ${plan}\nСумма: ${rub} ₽\nОплата прошла.`
  );
}
