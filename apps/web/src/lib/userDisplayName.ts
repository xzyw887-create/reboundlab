import { isTelegramPlaceholderEmail } from "@/lib/telegramIdentity";

type TelegramUserFields = {
  email: string;
  telegramId?: number | null;
  telegramUsername?: string | null;
  telegramDisplayName?: string | null;
};

/** Короткая подпись в шапке: @username → имя из Telegram → fallback. */
export function userDisplayLabel(
  user: TelegramUserFields,
  telegramFallback = "Telegram"
): string {
  const username = user.telegramUsername?.replace(/^@/, "").trim();
  if (username) return `@${username}`;

  const displayName = user.telegramDisplayName?.trim();
  if (displayName) return displayName;

  if (user.telegramId != null && isTelegramPlaceholderEmail(user.email)) {
    return telegramFallback;
  }

  return user.email;
}

/** Страница аккаунта — то же, без числового ID. */
export function userAccountLoginLabel(
  user: TelegramUserFields,
  telegramFallback: string
): string {
  return userDisplayLabel(user, telegramFallback);
}
