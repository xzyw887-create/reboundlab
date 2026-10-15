/** Временно: вход email+пароль (например проверка ЮKassa). Server-only. */
export function emailPasswordAuthEnabled(): boolean {
  return process.env.EMAIL_PASSWORD_AUTH === "1";
}
