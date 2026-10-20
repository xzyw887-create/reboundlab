import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";

/** Аккаунт, которому «Оформить» включает тариф и карту без ЮKassa. Только localhost-тестер и явный env-список. */
export function isFlowPreviewAccount(user: {
  email?: string | null;
  telegramId?: number | null;
  telegramUsername?: string | null;
  flowPreviewFlag?: boolean;
}): boolean {
  if (isDevLocalTesterAccount(user.email)) return true;
  const name = (user.telegramUsername || "").replace(/^@/, "").toLowerCase();

  const raw = process.env["BILLING_FLOW_PREVIEW_TELEGRAM"]?.trim();
  if (!raw) return false;
  const allow = raw
    .split(/[,\s]+/)
    .map((part) => part.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const id = user.telegramId != null ? String(user.telegramId) : "";
  return (id !== "" && allow.includes(id)) || (name !== "" && allow.includes(name));
}
