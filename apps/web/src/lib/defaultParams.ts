import type { BacktestParams } from "@/lib/types";

/** Demo / dev period — overridden by plan limits on load where needed. */
export const DEFAULT_TEST_START = "2026-06-12";
export const DEFAULT_TEST_END = "2026-07-11";

export const DEFAULT_BACKTEST_PARAMS: BacktestParams = {
  mode: "single",
  symbols: ["BTCUSDT"],
  excluded_symbols: [],
  deposit: 100,
  entry_pct: 10,
  leverage: 5,
  drop_pct: 1,
  timeframe: "1m",
  tp: 2,
  trailing: false,
  trailing_activation: 2,
  trailing_callback: 2,
  averaging_enabled: true,
  entry_prices_total: 3,
  averaging_drops: [5, 10, 15],
  averaging_margins: [10, 10, 10],
  max_open_trades: null,
  entry_pct_split: false,
  entry_pct_regular: 10,
  entry_pct_meme: 5,
  data_source: "db",
  start_date: DEFAULT_TEST_START,
  end_date: DEFAULT_TEST_END,
  auto_two_stage: true,
};

/** Strategy fields only — used when user picks Custom preset. */
export const CUSTOM_STRATEGY_BASELINE: Partial<BacktestParams> = {
  deposit: DEFAULT_BACKTEST_PARAMS.deposit,
  entry_pct: DEFAULT_BACKTEST_PARAMS.entry_pct,
  leverage: DEFAULT_BACKTEST_PARAMS.leverage,
  drop_pct: DEFAULT_BACKTEST_PARAMS.drop_pct,
  timeframe: DEFAULT_BACKTEST_PARAMS.timeframe,
  tp: DEFAULT_BACKTEST_PARAMS.tp,
  sl: undefined,
  trailing: DEFAULT_BACKTEST_PARAMS.trailing,
  trailing_activation: DEFAULT_BACKTEST_PARAMS.trailing_activation,
  trailing_callback: DEFAULT_BACKTEST_PARAMS.trailing_callback,
  averaging_enabled: DEFAULT_BACKTEST_PARAMS.averaging_enabled,
  entry_prices_total: DEFAULT_BACKTEST_PARAMS.entry_prices_total,
  averaging_drops: [...DEFAULT_BACKTEST_PARAMS.averaging_drops],
  averaging_margins: [...DEFAULT_BACKTEST_PARAMS.averaging_margins],
  max_open_trades: DEFAULT_BACKTEST_PARAMS.max_open_trades,
  entry_pct_split: DEFAULT_BACKTEST_PARAMS.entry_pct_split,
  entry_pct_regular: DEFAULT_BACKTEST_PARAMS.entry_pct_regular,
  entry_pct_meme: DEFAULT_BACKTEST_PARAMS.entry_pct_meme,
};

const PRESERVED_KEYS = [
  "mode",
  "symbols",
  "excluded_symbols",
  "start_date",
  "end_date",
  "data_source",
] as const satisfies readonly (keyof BacktestParams)[];

export function applyCustomBaseline(current: BacktestParams): BacktestParams {
  const preserved = Object.fromEntries(
    PRESERVED_KEYS.map((key) => [key, current[key]])
  ) as Pick<BacktestParams, (typeof PRESERVED_KEYS)[number]>;

  return {
    ...current,
    ...CUSTOM_STRATEGY_BASELINE,
    ...preserved,
    averaging_drops: [...(CUSTOM_STRATEGY_BASELINE.averaging_drops ?? [])],
    averaging_margins: [...(CUSTOM_STRATEGY_BASELINE.averaging_margins ?? [])],
  };
}
