import type { Locale } from "@/lib/i18n";

export type MarketLandingStats = {
  loadedPairs: number;
  /** Максимальная глубина одной монеты (дней data_from → data_to) */
  maxHistoryDays: number;
};

function pluralYearsRu(y: number): string {
  const n = Math.abs(y);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} лет`;
  if (mod10 === 1) return `${n} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} года`;
  return `${n} лет`;
}

function pluralMonthsRu(m: number): string {
  const n = Math.abs(m);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} месяцев`;
  if (mod10 === 1) return `${n} месяц`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} месяца`;
  return `${n} месяцев`;
}

export function formatPairsStat(count: number, locale: Locale): string | null {
  if (count <= 0) return null;
  if (locale === "en") {
    return count === 1 ? "1 USDT-M pair" : `${count} USDT-M pairs`;
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} пар USDT-M`;
  if (mod10 === 1) return `${count} пара USDT-M`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} пары USDT-M`;
  return `${count} пар USDT-M`;
}

/** Глубина по «самой длинной» монете в базе. */
export function formatMaxHistoryDepth(days: number, locale: Locale): string | null {
  if (days < 1) return null;
  if (days >= 365) {
    const y = Math.floor(days / 365);
    if (locale === "en") {
      return y === 1 ? "1 year" : `${y} years`;
    }
    return pluralYearsRu(y);
  }
  const months = Math.max(1, Math.round(days / 30));
  if (locale === "en") {
    return months === 1 ? "1 month" : `${months} months`;
  }
  return pluralMonthsRu(months);
}
