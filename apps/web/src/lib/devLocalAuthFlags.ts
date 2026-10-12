/** Клиент: показать кнопку локального входа на /login */
export function showDevLocalAuthUi(): boolean {
  return process.env.NEXT_PUBLIC_DEV_LOCAL_AUTH === "1";
}
