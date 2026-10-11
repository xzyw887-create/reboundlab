import type { TelegramWidgetAuth } from "@/lib/telegramLogin";

export function telegramPlaceholderEmail(telegramId: number): string {
  return `tg_${telegramId}@telegram.local`;
}

export function isTelegramPlaceholderEmail(email: string): boolean {
  return /^tg_\d+@telegram\.local$/.test(email);
}

/** Имя из профиля Telegram (first + last), как при входе через виджет. */
export function telegramDisplayNameFromPayload(
  payload: Pick<TelegramWidgetAuth, "first_name" | "last_name">
): string | null {
  const name = [payload.first_name, payload.last_name]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}
