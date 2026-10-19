import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";

/** Админский аккаунт для прохода оплаты без кабинета банка. */
const ADMIN_PREVIEW_USERNAMES = ["wasya_8"];

/** Аккаунт, которому «Оформить» включает тариф и карту без ЮKassa. */
export function isFlowPreviewAccount(user: {
  email?: string | null;
  telegramId?: number | null;
  telegramUsername?: string | null;
  flowPreviewFlag?: boolean;
}): boolean {
  if (user.flowPreviewFlag) return true;
  if (isDevLocalTesterAccount(user.email)) return true;
  const name = (user.telegramUsername || "").replace(/^@/, "").toLowerCase();
  if (name && ADMIN_PREVIEW_USERNAMES.includes(name)) return true;

  const raw = process.env["BILLING_FLOW_PREVIEW_TELEGRAM"]?.trim();
  if (!raw) return false;
  const allow = raw
    .split(/[,\s]+/)
    .map((part) => part.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const id = user.telegramId != null ? String(user.telegramId) : "";
  return (id !== "" && allow.includes(id)) || (name !== "" && allow.includes(name));
}
