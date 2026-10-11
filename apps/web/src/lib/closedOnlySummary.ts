import type { BacktestResult } from "@/lib/types";

type Summary = BacktestResult["summary"];

/** Итог и P&L только по закрытым сделкам — без нереализованного PnL открытых. */
export function closedOnlySummary(s: Summary) {
  if (s.closed_net_pnl_usd != null) {
    const pnlUsd = s.closed_net_pnl_usd;
    const balance = s.initial_deposit + pnlUsd;
    const pnlPct =
      s.initial_deposit > 0 ? (pnlUsd / s.initial_deposit) * 100 : 0;
    return { balance, pnlPct, pnlUsd };
  }

  const balance = s.realized_balance ?? s.final_balance;
  const pnlPct = s.realized_pnl_pct ?? s.final_pnl_pct;
  const pnlUsd = balance - s.initial_deposit;
  return { balance, pnlPct, pnlUsd };
}
