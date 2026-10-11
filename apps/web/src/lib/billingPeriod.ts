/** Календарный биллинг: якорь = день первой оплаты (UTC). */

export function clampAnchorDay(year: number, monthIndex: number, anchorDay: number): number {
  const last = daysInUtcMonth(year, monthIndex);
  return Math.min(Math.max(1, anchorDay), last);
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Конец UTC-дня (23:59:59.999). */
export function endOfUtcDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
}

/**
 * Конец оплаченного периода: тот же календарный день в следующем месяце.
 * Оплата 10-го → доступ до конца 10-го следующего месяца (UTC).
 */
export function periodEndFromPayment(paidAt: Date, anchorDay: number): Date {
  let y = paidAt.getUTCFullYear();
  let m = paidAt.getUTCMonth() + 1;
  if (m > 11) {
    y += 1;
    m = 0;
  }
  const d = clampAnchorDay(y, m, anchorDay);
  return endOfUtcDay(y, m, d);
}

/** Продление: следующий период после текущего `expiresAt`. */
export function periodEndAfterRenewal(currentExpiresAt: Date, anchorDay: number): Date {
  let y = currentExpiresAt.getUTCFullYear();
  let m = currentExpiresAt.getUTCMonth() + 1;
  if (m > 11) {
    y += 1;
    m = 0;
  }
  const d = clampAnchorDay(y, m, anchorDay);
  return endOfUtcDay(y, m, d);
}

export function anchorDayFromDate(d: Date): number {
  return d.getUTCDate();
}
