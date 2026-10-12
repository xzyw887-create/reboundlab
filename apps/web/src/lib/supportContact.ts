/** Public support links — configure in production .env (see scripts/production.env.example). */

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@backtestpro.ru";

export const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/BackTestPro_Help";

export const TELEGRAM_HANDLE =
  process.env.NEXT_PUBLIC_TELEGRAM_HANDLE ?? "@BackTestPro_Help";

/** group | channel | personal — affects hint text on /help */
export type TelegramContactKind = "group" | "channel" | "personal";

export function telegramContactKind(): TelegramContactKind {
  const k = process.env.NEXT_PUBLIC_TELEGRAM_KIND?.trim().toLowerCase();
  if (k === "group" || k === "channel" || k === "personal") return k;
  return "group";
}
