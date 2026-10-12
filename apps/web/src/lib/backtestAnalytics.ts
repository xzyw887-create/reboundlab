import type { BacktestResult, Trade } from "@/lib/types";

export interface CoinStats {
  symbol: string;
  trades: number;
  closedTrades: number;
  netPnlUsd: number;
  maxDrawdownPct: number;
}

export interface MonthStats {
  month: string;
  netPnlUsd: number;
  pnlPct: number;
  trades: number;
}

export interface BacktestAnalytics {
  maxRealizedDrawdownPct: number;
  maxEquityDrawdownPct: number | null;
  equityAtEndUsd: number;
  winRatePct: number | null;
  avgTradeUsd: number | null;
  totalFeesUsd: number;
  totalFundingUsd: number;
  closedTrades: number;
  perCoin: CoinStats[];
  monthly: MonthStats[];
}

function tradeNetPnl(t: Trade): number {
  if (t.net_pnl_usd != null) return t.net_pnl_usd;
  return t.pnl_usd - t.fees_paid - (t.funding_paid ?? 0);
}

function isClosed(t: Trade): boolean {
  return (
    t.closed_at != null ||
    t.status === "closed" ||
    t.status === "liquidated"
  );
}

export function computeMaxDrawdownPct(
  pnlCurve: BacktestResult["pnl_curve"],
  initialDeposit: number
): number {
  if (pnlCurve.length === 0 || initialDeposit <= 0) return 0;

  let peak = initialDeposit;
  let maxDd = 0;

  for (const point of pnlCurve) {
    const balance = point.balance;
    if (balance > peak) peak = balance;
    if (peak > 0) {
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }

  return maxDd;
}

function computeCoinDrawdown(trades: Trade[], symbol: string, deposit: number): number {
  const closed = trades
    .filter((t) => t.symbol === symbol && isClosed(t))
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  if (closed.length === 0) return 0;

  let balance = deposit;
  let peak = deposit;
  let maxDd = 0;

  for (const t of closed) {
    balance += tradeNetPnl(t);
    if (balance > peak) peak = balance;
    if (peak > 0) {
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }

  return maxDd;
}

export function computeBacktestAnalytics(result: BacktestResult): BacktestAnalytics {
  const s = result.summary;
  const deposit = s.initial_deposit;
  const closed = result.trades.filter(isClosed);
  const closedTrades = closed.length;

  const totalFeesUsd = result.trades.reduce((sum, t) => sum + t.fees_paid, 0);
  const totalFundingUsd = result.trades.reduce(
    (sum, t) => sum + (t.funding_paid ?? 0),
    0
  );

  const winning = closed.filter((t) => tradeNetPnl(t) > 0).length;
  const closedNet = closed.reduce((sum, t) => sum + tradeNetPnl(t), 0);

  const symbols = [...new Set(result.trades.map((t) => t.symbol).filter(Boolean))] as string[];

  const perCoin: CoinStats[] = symbols.map((symbol) => {
    const symTrades = result.trades.filter((t) => t.symbol === symbol);
    const symClosed = symTrades.filter(isClosed);
    return {
      symbol,
      trades: symTrades.length,
      closedTrades: symClosed.length,
      netPnlUsd: symClosed.reduce((sum, t) => sum + tradeNetPnl(t), 0),
      maxDrawdownPct: computeCoinDrawdown(result.trades, symbol, deposit),
    };
  });

  perCoin.sort((a, b) => a.netPnlUsd - b.netPnlUsd);

  const monthMap = new Map<string, { net: number; trades: number }>();

  for (const t of closed) {
    if (!t.closed_at) continue;
    const month = t.closed_at.slice(0, 7);
    const prev = monthMap.get(month) ?? { net: 0, trades: 0 };
    prev.net += tradeNetPnl(t);
    prev.trades += 1;
    monthMap.set(month, prev);
  }

  const monthly: MonthStats[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      netPnlUsd: data.net,
      pnlPct: deposit > 0 ? (data.net / deposit) * 100 : 0,
      trades: data.trades,
    }));

  const equityCurve = result.equity_curve?.length
    ? result.equity_curve
    : result.pnl_curve;

  return {
    maxRealizedDrawdownPct: computeMaxDrawdownPct(result.pnl_curve, deposit),
    maxEquityDrawdownPct: computeMaxDrawdownPct(equityCurve, deposit),
    equityAtEndUsd: s.final_balance,
    winRatePct: closedTrades > 0 ? (winning / closedTrades) * 100 : null,
    avgTradeUsd: closedTrades > 0 ? closedNet / closedTrades : null,
    totalFeesUsd,
    totalFundingUsd,
    closedTrades,
    perCoin,
    monthly,
  };
}
