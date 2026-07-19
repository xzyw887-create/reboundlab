export interface BacktestParams {
  mode: "single" | "multi";
  symbols: string[];
  excluded_symbols: string[];
  deposit: number;
  entry_pct: number;
  leverage: number;
  drop_pct: number;
  timeframe: string;
  tp: number;
  sl?: number;
  /** Run grid-search optimizer (Automatic mode) */
  automatic?: boolean;
  /** How many combos to run in Automatic: sample size or all (>= total) */
  auto_trials?: number;
  /** Custom TP % values for Automatic grid (default: 2,3,4,5,6,8,10) */
  auto_tp_grid?: number[];
  /** Stage 2: refine TP around stage-1 winner */
  auto_two_stage?: boolean;
  fee_rate?: number;
  use_real_funding?: boolean;
  trailing: boolean;
  trailing_activation: number;
  trailing_callback: number;
  averaging_enabled: boolean;
  /** Total entry prices in one trade: 2, 3, or 4 (first buy + averages) */
  entry_prices_total: 2 | 3 | 4;
  /** Drop % from avg price to trigger each extra entry leg */
  averaging_drops: number[];
  /** Margin % of bank for each averaging leg */
  averaging_margins: number[];
  /** Max simultaneous open positions (multi); null = no limit */
  max_open_trades: number | null;
  /** Split entry %: regular coins vs memes */
  entry_pct_split: boolean;
  entry_pct_regular: number;
  entry_pct_meme: number;
  data_source: "db" | "demo";
  start_date: string;
  end_date: string;
}

export const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "1 мин" },
  { value: "15m", label: "15 мин" },
  { value: "30m", label: "30 мин" },
  { value: "1h", label: "1 час" },
  { value: "4h", label: "4 часа" },
  { value: "1d", label: "1 день" },
] as const;

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  symbol?: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  close_reason: string | null;
  entry_pct: number;
  leverage: number;
  avg_count: number;
  avg_price: number;
  entry_price: number;
  entry_liq_price?: number;
  final_liq_price?: number;
  avg_entry_prices?: number[];
  total_margin: number;
  /** Sum of all legs: margin × leverage — the amount we trade with */
  total_notional?: number;
  exit_price: number | null;
  mark_price: number | null;
  /** TP (or trailing) — цена, по которой сделка должна закрыться */
  target_exit_price?: number | null;
  is_open?: boolean;
  liq_price: number;
  pnl_usd: number;
  pnl_pct: number;
  /** PnL after fees and funding */
  net_pnl_usd?: number;
  fees_paid: number;
  funding_paid?: number;
  mmr_pct?: number | null;
  maintenance_margin_usd?: number | null;
  bank_at_open: number;
  bank_at_close: number;
  entries: {
    time: string;
    price: number;
    margin_usd: number;
    notional_usd?: number;
    qty?: number;
    pct_of_deposit: number;
    liq_price: number;
  }[];
}

export interface Marker {
  time: number;
  position: string;
  color: string;
  shape: string;
  text: string;
  price?: number;
  kind?: "buy" | "sell" | "avg";
}

export interface BacktestResult {
  mode: "single" | "multi";
  summary: {
    symbol: string;
    symbols: string[];
    initial_deposit: number;
    final_balance: number;
    final_pnl_pct: number;
    /** Cash + margins in open trades, without unrealized PnL */
    realized_balance?: number;
    realized_pnl_pct?: number;
    closed_net_pnl_usd?: number;
    open_unrealized_pnl_usd?: number;
    open_net_pnl_usd?: number;
    total_trades: number;
    winning_trades: number;
    open_trades: number;
    closed_trades?: number;
    /** Есть открытые сделки на конец периода */
    excludes_open_trade?: boolean;
    last_open_trade?: {
      symbol: string;
      opened_at: string;
      mark_price: number | null;
      avg_price?: number;
      target_exit_price?: number | null;
      unrealized_pnl_usd: number;
      net_pnl_usd?: number;
      fees_paid?: number;
      funding_paid?: number;
      margin_usd?: number;
      avg_count?: number;
    } | null;
    liquidated: boolean;
    liquidated_at: string | null;
    liquidated_symbol: string | null;
    excluded_symbols: string[];
  };
  candles: Candle[];
  candles_by_symbol: Record<string, Candle[]>;
  candles_1m_by_symbol?: Record<string, Candle[]>;
  pnl_curve: { time: number; balance: number; pnl_pct: number }[];
  trades: Trade[];
  trades_by_symbol: Record<string, Trade[]>;
  markers: Marker[];
  meta?: {
    data_source?: string;
    start_date?: string;
    end_date?: string;
    timeframe?: string;
    fee_rate?: number;
    use_real_funding?: boolean;
  };
  optimization?: {
    best_params: {
      drop_pct: number;
      tp: number;
      trailing: boolean;
      trailing_activation: number;
      trailing_callback: number;
      excluded_symbols?: string[];
      averaging_drops?: number[];
      averaging_margins?: number[];
      entry_prices_total?: number;
    };
    best_realized_balance?: number;
    best_final_balance: number;
    trials: number;
    estimated_trials?: number;
    estimated_seconds?: number;
    elapsed_seconds?: number;
    stage1_trials?: number;
    stage2_trials?: number;
    two_stage?: boolean;
    comparison: Array<Record<string, unknown>>;
  };
}

export const DEMO_COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

export interface SymbolInfo {
  symbol: string;
  base: string;
  active: boolean;
  history_from: string | null;
  min_history_days?: number;
  data_from: string | null;
  data_to: string | null;
  candle_count: number;
  loaded: boolean;
}

export interface SymbolsResponse {
  symbols: SymbolInfo[];
  coverage: { from: string; to: string; loaded_pairs: number } | null;
  total_active: number;
  total_loaded: number;
}
