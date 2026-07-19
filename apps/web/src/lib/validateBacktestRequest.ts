import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { computeSelectedCoverage } from "@/lib/dateCoverage";
import {
  tierHistoryWindow,
  validateBacktestDateRange,
  type PlanDateContext,
} from "@/lib/planDateLimits";
import {
  resolveEffectiveSubscription,
  validateBacktestFeatures,
} from "@/lib/subscriptionEnforcement";
import type { BacktestParams, SymbolInfo } from "@/lib/types";

async function loadSymbolCatalog(): Promise<SymbolInfo[]> {
  const rows = await query<{
    symbol: string;
    base_asset: string;
    is_active: boolean;
    history_from: Date | null;
    data_from: Date | null;
    data_to: Date | null;
    candle_count: string;
  }>(
    `SELECT
        tp.symbol,
        tp.base_asset,
        tp.is_active,
        tp.history_from,
        MIN(c.open_time) AS data_from,
        MAX(c.open_time) AS data_to,
        COUNT(c.open_time) AS candle_count
     FROM market.trading_pairs tp
     JOIN market.exchanges e ON e.id = tp.exchange_id
     LEFT JOIN market.candles c ON c.pair_id = tp.id AND c.timeframe = '1m'
     WHERE e.code = 'binance' AND tp.is_active = TRUE
     GROUP BY tp.id, tp.symbol, tp.base_asset, tp.is_active, tp.history_from
     ORDER BY tp.symbol ASC`
  );

  return rows.map((row) => {
    const count = Number(row.candle_count || 0);
    return {
      symbol: row.symbol,
      base: row.base_asset,
      active: row.is_active,
      history_from: row.history_from?.toISOString().slice(0, 10) ?? null,
      min_history_days: 0,
      data_from: row.data_from?.toISOString().slice(0, 10) ?? null,
      data_to: row.data_to?.toISOString().slice(0, 10) ?? null,
      candle_count: count,
      loaded: count > 0,
    };
  });
}

export async function validateBacktestRequest(
  params: Partial<BacktestParams>
): Promise<string | null> {
  const auth = await getAuthUser();
  const sub = resolveEffectiveSubscription(auth);

  if (sub.blockedReason) {
    return sub.blockedReason;
  }

  const featureError = validateBacktestFeatures(params, sub.tier);
  if (featureError) return featureError;

  const symbols = params.symbols ?? [];
  const excluded = params.excluded_symbols ?? [];
  const start = params.start_date;
  const end = params.end_date;
  if (!start || !end) return "Укажите период теста";

  const planCtx: PlanDateContext = {
    tier: sub.tier,
    registeredAt: sub.registeredAt,
  };

  const catalog = await loadSymbolCatalog();
  const coverage = computeSelectedCoverage(symbols, excluded, catalog, planCtx);
  if (!coverage) {
    const window = tierHistoryWindow(planCtx);
    return `Нет данных для выбранных монет в периоде ${window.from} — ${window.to}`;
  }

  return validateBacktestDateRange(start, end, coverage);
}
