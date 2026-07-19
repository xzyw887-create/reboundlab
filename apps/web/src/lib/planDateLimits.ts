import type { PlanTier } from "@/lib/subscriptionTiers";
import { featuresForTier } from "@/lib/subscriptionTiers";

/** Календарные дни истории на пробном тарифе (≈3 месяца). */
export const TRIAL_HISTORY_DAYS = 90;

/** Календарные дни истории на Basic / Pro (3 года). */
export const PAID_HISTORY_DAYS = 1095;

export interface PlanDateContext {
  tier: PlanTier;
  /** YYYY-MM-DD — дата регистрации (UTC), якорь пробного окна */
  registeredAt: string | null;
}

export function isoDateUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function addCalendarDays(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return isoDateUtc(d);
}

export function maxIso(a: string, b: string): string {
  return a > b ? a : b;
}

export function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

/** Доступное окно дат по тарифу (до пересечения с данными монеты). */
export function tierHistoryWindow(
  ctx: PlanDateContext,
  today: string = isoDateUtc()
): { from: string; to: string } {
  const maxDays = featuresForTier(ctx.tier).maxDays;

  if (ctx.tier === "trial") {
    const anchor = ctx.registeredAt ?? today;
    return {
      from: addCalendarDays(anchor, -maxDays),
      to: today,
    };
  }

  return {
    from: addCalendarDays(today, -maxDays),
    to: today,
  };
}

/** Пересечение свечей монеты с тарифным окном. */
export function clampCoinRangeToPlan(
  dataFrom: string,
  dataTo: string,
  window: { from: string; to: string }
): { from: string; to: string } | null {
  const from = maxIso(dataFrom, window.from);
  const to = minIso(dataTo, window.to);
  if (from > to) return null;
  return { from, to };
}

export function validateBacktestDateRange(
  start: string,
  end: string,
  coverage: { from: string; to: string }
): string | null {
  if (start > end) return "Начало периода позже конца";
  if (start < coverage.from || end > coverage.to) {
    return `Период вне доступного диапазона (${coverage.from} — ${coverage.to})`;
  }
  return null;
}
