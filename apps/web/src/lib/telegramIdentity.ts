export function telegramPlaceholderEmail(telegramId: number): string {
  return `tg_${telegramId}@telegram.local`;
}

export function isTelegramPlaceholderEmail(email: string): boolean {
  return /^tg_\d+@telegram\.local$/.test(email);
}
