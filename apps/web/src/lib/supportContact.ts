/** Public support links — configure in production .env (see scripts/production.env.example). */

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@backtestpro.ru";

export const TELEGRAM_URL = "https://t.me/Btpkod_bot";

export const TELEGRAM_HANDLE = "@Btpkod_bot";

/** group | channel | personal — affects hint text on /help */
export type TelegramContactKind = "group" | "channel" | "personal";

export function telegramContactKind(): TelegramContactKind {
  const k = process.env.NEXT_PUBLIC_TELEGRAM_KIND?.trim().toLowerCase();
  if (k === "group" || k === "channel" || k === "personal") return k;
  return "group";
}
