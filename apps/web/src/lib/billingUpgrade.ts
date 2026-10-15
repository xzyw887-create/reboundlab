import { clampAnchorDay } from "@/lib/billingPeriod";

function periodStartBeforeEnd(expiresAt: Date, anchorDay: number): Date {
  let y = expiresAt.getUTCFullYear();
  let m = expiresAt.getUTCMonth() - 1;
  if (m < 0) {
    y -= 1;
    m = 11;
  }
  const d = clampAnchorDay(y, m, anchorDay);
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}

/** Доплата Basic → Pro за оставшийся оплаченный период */
export function upgradeTopUpRub(
  basicMonthlyRub: number,
  proMonthlyRub: number,
  expiresAt: Date,
  anchorDay: number
): number {
  const now = Date.now();
  const end = expiresAt.getTime();
  if (end <= now) return Math.max(0, proMonthlyRub - basicMonthlyRub);

  const start = periodStartBeforeEnd(expiresAt, anchorDay).getTime();
  const total = Math.max(1, end - start);
  const left = Math.max(0, end - now);
  const ratio = left / total;
  const diff = proMonthlyRub - basicMonthlyRub;
  return Math.max(1, Math.round(diff * ratio));
}
