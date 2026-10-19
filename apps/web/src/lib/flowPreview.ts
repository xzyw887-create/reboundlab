import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";

/** Аккаунт, которому можно проходить оплату кнопкой «Ок» без ввода карты. */
export function isFlowPreviewAccount(user: {
  email?: string | null;
  telegramId?: number | null;
  telegramUsername?: string | null;
  flowPreviewFlag?: boolean;
}): boolean {
  if (user.flowPreviewFlag) return true;
  if (isDevLocalTesterAccount(user.email)) return true;

  const raw = process.env["BILLING_FLOW_PREVIEW_TELEGRAM"]?.trim();
  if (!raw) return false;
  const allow = raw
    .split(/[,\s]+/)
    .map((part) => part.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const id = user.telegramId != null ? String(user.telegramId) : "";
  const name = (user.telegramUsername || "").replace(/^@/, "").toLowerCase();
  return (id !== "" && allow.includes(id)) || (name !== "" && allow.includes(name));
}
