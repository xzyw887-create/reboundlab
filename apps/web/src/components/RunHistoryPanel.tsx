"use client";

import type { BacktestParams } from "@/lib/types";
import { paramsSummary } from "@/lib/compareRuns";
import { useLocale } from "@/lib/i18n";

export interface SavedBacktestRun {
  id: string;
  label: string;
  params: BacktestParams;
  summary: {
    initial_deposit: number;
    final_balance: number;
    final_pnl_pct: number;
    realized_pnl_pct?: number;
    total_trades: number;
    symbols: string[];
    mode: string;
    start_date?: string;
    end_date?: string;
  };
  created_at: string;
}

interface Props {
  runs: SavedBacktestRun[];
  loading: boolean;
  onLoad: (run: SavedBacktestRun) => void;
  onDelete: (id: string) => void;
}

export function RunHistoryPanel({ runs, loading, onLoad, onDelete }: Props) {
  const { t } = useLocale();

  if (loading) {
    return (
      <p className="text-sm text-muted text-center py-12">{t.history.loading}</p>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="card-pro">
        <div className="card-pro-body text-center py-12 space-y-2">
          <p className="text-sm text-gray-200">{t.history.empty}</p>
          <p className="text-xs text-muted">{t.history.emptyHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const pnl =
          run.summary.realized_pnl_pct ?? run.summary.final_pnl_pct;
        return (
          <div key={run.id} className="card-pro">
            <div className="card-pro-body flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-muted">
                  {new Date(run.created_at).toLocaleString()}
                </p>
                <p className="text-sm font-medium text-white truncate">
                  {run.label || paramsSummary(run.params, t)}
                </p>
                <p className="text-xs text-muted">
                  {run.summary.symbols.map((s) => s.replace("USDT", "")).join(", ")}
                  {" · "}
                  {run.summary.start_date ?? run.params.start_date} —{" "}
                  {run.summary.end_date ?? run.params.end_date}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      pnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted">
                    {run.summary.total_trades} {t.history.trades}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onLoad(run)}
                    title={t.history.loadHint}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    {t.history.load}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(run.id)}
                    className="btn-ghost px-3 py-1.5 text-xs text-muted hover:text-red-400"
                  >
                    {t.history.delete}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
