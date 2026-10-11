import type { SymbolInfo } from "@/lib/types";
import { queryWithSession } from "@/lib/db";

interface SymbolRow {
  symbol: string;
  base_asset: string;
  is_active: boolean;
  history_from: Date | null;
  min_history_days: number | null;
  data_from: Date | null;
  data_to: Date | null;
  candle_count: string;
}

type SymbolsResult = {
  symbols: SymbolInfo[];
  coverage: { from: string; to: string; loaded_pairs: number } | null;
  total_active: number;
  total_loaded: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var symbolsCache: { at: number; data: SymbolsResult } | undefined;
  // eslint-disable-next-line no-var
  var symbolsInflight: Promise<SymbolsResult> | undefined;
}

const SYMBOLS_SQL = `
  WITH agg AS (
    SELECT
      pair_id,
      MIN(open_time) AS data_from,
      MAX(open_time) AS data_to,
      COUNT(*)::bigint AS candle_count
    FROM market.candles
    WHERE timeframe = '1m'
    GROUP BY pair_id
  )
  SELECT
    tp.symbol,
    tp.base_asset,
    tp.is_active,
    tp.history_from,
    tp.min_history_days,
    agg.data_from,
    agg.data_to,
    agg.candle_count::text AS candle_count
  FROM market.trading_pairs tp
  JOIN market.exchanges e ON e.id = tp.exchange_id
  LEFT JOIN agg ON agg.pair_id = tp.id
  WHERE e.code = 'binance' AND tp.is_active = TRUE
  ORDER BY agg.candle_count DESC NULLS LAST, tp.symbol ASC
`;

export async function listSymbolsFromDb(): Promise<SymbolsResult> {
  const cached = global.symbolsCache;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  if (global.symbolsInflight) {
    return global.symbolsInflight;
  }

  global.symbolsInflight = loadSymbolsFromDb().finally(() => {
    global.symbolsInflight = undefined;
  });

  return global.symbolsInflight;
}

async function loadSymbolsFromDb(): Promise<SymbolsResult> {
  const rows = await queryWithSession<SymbolRow>(
    [
      "SET work_mem = '128MB'",
      "SET statement_timeout = '120s'",
    ],
    SYMBOLS_SQL
  );

  const symbols: SymbolInfo[] = rows.map((row) => {
    const count = Number(row.candle_count || 0);
    return {
      symbol: row.symbol,
      base: row.base_asset,
      active: row.is_active,
      history_from: row.history_from
        ? row.history_from.toISOString().slice(0, 10)
        : null,
      min_history_days: Number(row.min_history_days || 0),
      data_from: row.data_from
        ? row.data_from.toISOString().slice(0, 10)
        : null,
      data_to: row.data_to ? row.data_to.toISOString().slice(0, 10) : null,
      candle_count: count,
      loaded: count > 0,
    };
  });

  const loaded = symbols.filter((s) => s.loaded);
  let coverage = null;
  if (loaded.length > 0) {
    const fromDates = loaded.map((s) => s.data_from).filter(Boolean) as string[];
    const toDates = loaded.map((s) => s.data_to).filter(Boolean) as string[];
    coverage = {
      from: fromDates.sort()[0],
      to: toDates.sort().at(-1)!,
      loaded_pairs: loaded.length,
    };
  }

  const result: SymbolsResult = {
    symbols,
    coverage,
    total_active: symbols.length,
    total_loaded: loaded.length,
  };

  global.symbolsCache = { at: Date.now(), data: result };
  return result;
}
