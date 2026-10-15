/** Клиент: форма email+пароль на /login и /register */
export function showEmailPasswordAuthUi(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_PASSWORD_AUTH === "1";
}
