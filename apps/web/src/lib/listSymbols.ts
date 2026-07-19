import type { SymbolInfo } from "@/lib/types";
import { query } from "@/lib/db";

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

export async function listSymbolsFromDb(): Promise<{
  symbols: SymbolInfo[];
  coverage: { from: string; to: string; loaded_pairs: number } | null;
  total_active: number;
  total_loaded: number;
}> {
  const rows = await query<SymbolRow>(
    `
    SELECT
      tp.symbol,
      tp.base_asset,
      tp.is_active,
      tp.history_from,
      tp.min_history_days,
      MIN(c.open_time) AS data_from,
      MAX(c.open_time) AS data_to,
      COUNT(c.open_time) AS candle_count
    FROM market.trading_pairs tp
    JOIN market.exchanges e ON e.id = tp.exchange_id
    LEFT JOIN market.candles c
      ON c.pair_id = tp.id AND c.timeframe = '1m'
    WHERE e.code = 'binance' AND tp.is_active = TRUE
    GROUP BY tp.id, tp.symbol, tp.base_asset, tp.is_active, tp.history_from, tp.min_history_days
    ORDER BY COUNT(c.open_time) DESC NULLS LAST, tp.symbol ASC
    `
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

  return {
    symbols,
    coverage,
    total_active: symbols.length,
    total_loaded: loaded.length,
  };
}
