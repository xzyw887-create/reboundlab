"use client";

import { useMemo, useState } from "react";
import type { SavedRun } from "@/lib/compareRuns";
import type { BacktestResult } from "@/lib/types";
import { TIMEFRAME_OPTIONS } from "@/lib/types";
import { PriceChart } from "@/components/PriceChart";
import { PnlChart } from "@/components/PnlChart";
import { TradesTable } from "@/components/TradesTable";
import { TradesOutcomeSummary } from "@/components/TradesOutcomeSummary";
import { resampleCandles } from "@/lib/resampleCandles";
import { useLocale } from "@/lib/i18n";
import { closedOnlySummary } from "@/lib/closedOnlySummary";

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

function snapToCandle(
  unix: number,
  candles: { time: number }[],
  timeframe: string
): number | null {
  if (candles.length === 0) return null;
  const period = TF_SECONDS[timeframe] ?? 60;
  for (const c of candles) {
    if (c.time <= unix && unix < c.time + period) return c.time;
  }
  return null;
}

function buildMarkers(
  trades: BacktestResult["trades"],
  symbol: string,
  candles: { time: number }[],
  timeframe: string
) {
  const filtered = trades.filter((t) => t.symbol === symbol);
  const markers: BacktestResult["markers"] = [];
  for (const trade of filtered) {
    const openTime = snapToCandle(
      Math.floor(new Date(trade.opened_at).getTime() / 1000),
      candles,
      timeframe
    );
    if (openTime !== null) {
      markers.push({
        time: openTime,
        position: "belowBar" as const,
        color: "#22c55e",
        shape: "arrowUp" as const,
        text: "Buy",
      });
    }
    if (trade.closed_at) {
      const closeTime = snapToCandle(
        Math.floor(new Date(trade.closed_at).getTime() / 1000),
        candles,
        timeframe
      );
      if (closeTime !== null) {
        markers.push({
          time: closeTime,
          position: "aboveBar" as const,
          color: "#ef4444",
          shape: "arrowDown" as const,
          text: "Sell",
        });
      }
    }
  }
  return markers;
}

export function RunSummaryCard({ run }: { run: SavedRun }) {
  const { t } = useLocale();
  const s = run.result.summary;
  const { balance: displayBalance, pnlPct: displayPnlPct, pnlUsd } =
    closedOnlySummary(s);
  const hasOpenAtEnd = (s.open_trades ?? 0) > 0;

  return (
    <div className="space-y-2 mt-2">
      <TradesOutcomeSummary summary={s} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t.app.deposit, value: `$${s.initial_deposit}`, color: "text-white" },
          {
            label: hasOpenAtEnd ? t.app.resultClosed : t.app.result,
            value: `$${displayBalance.toFixed(2)}`,
            color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            label: hasOpenAtEnd ? t.compare.profit + " (" + t.app.tradesClosed + ")" : t.compare.profit,
            value: `${displayPnlPct >= 0 ? "+" : ""}${displayPnlPct.toFixed(2)}%`,
            color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            label: t.compare.coins,
            value: s.symbols.map((x) => x.replace("USDT", "")).join(" + "),
            color: "text-accent",
          },
        ].map((card) => (
          <div key={card.label} className="stat-card py-2 px-3">
            <p className="label-caps text-[10px]">{card.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StrategyCompareColumn({ run }: { run: SavedRun }) {
  const { t } = useLocale();
  const [chartSymbol, setChartSymbol] = useState(
    run.params.symbols.find((s) => !run.params.excluded_symbols.includes(s)) ??
      run.params.symbols[0] ??
      "BTCUSDT"
  );
  const [timeframe, setTimeframe] = useState(run.params.timeframe);

  const result = run.result;
  const candles1m = useMemo(() => {
    return (
      result.candles_1m_by_symbol?.[chartSymbol] ??
      result.candles_by_symbol?.[chartSymbol] ??
      []
    );
  }, [result, chartSymbol]);

  const chartCandles = useMemo(
    () => resampleCandles(candles1m, timeframe),
    [candles1m, timeframe]
  );

  const chartMarkers = useMemo(
    () => buildMarkers(result.trades, chartSymbol, chartCandles, timeframe),
    [result, chartSymbol, chartCandles, timeframe]
  );

  const s = result.summary;
  const { balance: displayBalance, pnlPct: displayPnlPct, pnlUsd } =
    closedOnlySummary(s);

  return (
    <div className="space-y-4 min-w-0">
      <div className="card-pro">
        <div className="card-pro-body">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h3 className="text-sm font-semibold text-white">{t.app.chartTitle}</h3>
            <div className="flex gap-1 flex-wrap">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-0.5 text-[10px] text-gray-300"
              >
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>
              {result.mode === "multi" &&
                s.symbols?.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setChartSymbol(sym)}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      chartSymbol === sym ? "chip-active" : "btn-ghost"
                    }`}
                  >
                    {sym.replace("USDT", "")}
                  </button>
                ))}
            </div>
          </div>
          <PriceChart candles={chartCandles} markers={chartMarkers} />
        </div>
      </div>

      {result.pnl_curve.length > 0 && (
        <div className="card-pro">
          <div className="card-pro-body py-2">
            <PnlChart
              data={result.pnl_curve}
              initialDeposit={s.initial_deposit}
              periodStart={result.meta?.start_date ?? run.params.start_date}
              periodEnd={result.meta?.end_date ?? run.params.end_date}
              height={110}
            />
          </div>
        </div>
      )}

      <div className="card-pro">
        <div className="card-pro-body">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{t.app.tradesTable}</h3>
            <TradesOutcomeSummary summary={s} />
          </div>
          <TradesTable
            trades={result.trades}
            showAveraging={run.params.averaging_enabled}
            account={{
              initialDeposit: s.initial_deposit,
              closedNetPnlUsd: pnlUsd,
              openNetPnlUsd: s.open_net_pnl_usd,
            }}
          />
        </div>
      </div>
    </div>
  );
}
