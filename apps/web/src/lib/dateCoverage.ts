import type { SymbolInfo } from "@/lib/types";
import {
  clampCoinRangeToPlan,
  tierHistoryWindow,
  type PlanDateContext,
} from "@/lib/planDateLimits";

export interface DateCoverage {
  /** Пересечение диапазонов — когда у всех выбранных монет есть свечи в рамках тарифа */
  from: string;
  to: string;
  /** Окно тарифа до пересечения с монетами */
  planWindow: { from: string; to: string };
  perCoin: Array<{
    symbol: string;
    from: string;
    to: string;
    data_from: string;
    data_to: string;
    candle_count: number;
    /** Монета начинает торговать позже общего старта (Pro multi) */
    lateStart: boolean;
  }>;
}

export function computeSelectedCoverage(
  symbols: string[],
  excluded: string[],
  catalog: SymbolInfo[],
  plan?: PlanDateContext | null
): DateCoverage | null {
  const active = symbols.filter((s) => !excluded.includes(s));
  if (active.length === 0) return null;

  const planWindow = plan
    ? tierHistoryWindow(plan)
    : { from: "1970-01-01", to: "2099-12-31" };

  const perCoin: DateCoverage["perCoin"] = [];
  for (const sym of active) {
    const info = catalog.find((s) => s.symbol === sym);
    if (!info?.loaded || !info.data_from || !info.data_to) {
      return null;
    }
    const effective = clampCoinRangeToPlan(
      info.data_from,
      info.data_to,
      planWindow
    );
    if (!effective) {
      return null;
    }
    perCoin.push({
      symbol: sym,
      from: effective.from,
      to: effective.to,
      data_from: info.data_from,
      data_to: info.data_to,
      candle_count: info.candle_count,
      lateStart: false,
    });
  }

  const from = perCoin.reduce(
    (max, c) => (c.from > max ? c.from : max),
    perCoin[0].from
  );
  const to = perCoin.reduce(
    (min, c) => (c.to < min ? c.to : min),
    perCoin[0].to
  );

  if (from > to) return null;

  for (const c of perCoin) {
    c.lateStart = c.from > from;
  }

  return { from, to, planWindow, perCoin };
}

export function clampDateRange(
  start: string,
  end: string,
  coverage: Pick<DateCoverage, "from" | "to">
): { start: string; end: string } {
  let s = start;
  let e = end;
  if (s < coverage.from) s = coverage.from;
  if (s > coverage.to) s = coverage.from;
  if (e > coverage.to) e = coverage.to;
  if (e < coverage.from) e = coverage.to;
  if (e < s) e = s;
  return { start: s, end: e };
}

export function formatCoverageDays(from: string, to: string): number {
  const a = new Date(from + "T12:00:00");
  const b = new Date(to + "T12:00:00");
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}
