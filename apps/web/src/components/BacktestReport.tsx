"use client";

import type { BacktestResult } from "@/lib/types";
import { computeBacktestAnalytics } from "@/lib/backtestAnalytics";
import { useLocale } from "@/lib/i18n";

interface Props {
  result: BacktestResult;
}

function fmtUsd(v: number): string {
  return `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function formatMonth(isoMonth: string, locale: "en" | "ru"): string {
  const [y, m] = isoMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

export function BacktestReport({ result }: Props) {
  const { locale, t } = useLocale();
  const analytics = computeBacktestAnalytics(result);
  const showPerCoin = analytics.perCoin.length > 1;
  const showMonthly = analytics.monthly.length > 1;

  const metricRows = [
    {
      label: t.report.maxRealizedDrawdown,
      value: `-${analytics.maxRealizedDrawdownPct.toFixed(1)}%`,
      className: "text-red-400",
    },
    {
      label: t.report.maxEquityDrawdown,
      value:
        analytics.maxEquityDrawdownPct != null
          ? `-${analytics.maxEquityDrawdownPct.toFixed(1)}%`
          : "—",
      className: "text-red-400",
    },
    {
      label: t.report.equityAtEnd,
      value: `$${analytics.equityAtEndUsd.toFixed(2)}`,
      className: "text-gray-100",
    },
    {
      label: t.report.winRate,
      value:
        analytics.winRatePct != null ? `${analytics.winRatePct.toFixed(0)}%` : "—",
      className: "text-gray-200",
    },
    {
      label: t.report.avgTrade,
      value:
        analytics.avgTradeUsd != null ? fmtUsd(analytics.avgTradeUsd) : "—",
      className:
        analytics.avgTradeUsd != null && analytics.avgTradeUsd >= 0
          ? "text-green-400"
          : "text-red-400",
    },
    {
      label: t.report.totalFees,
      value: `$${analytics.totalFeesUsd.toFixed(2)}`,
      className: "text-gray-200",
    },
    {
      label: t.report.totalFunding,
      value: `$${analytics.totalFundingUsd.toFixed(2)}`,
      className: "text-gray-200",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">{t.report.title}</h3>
        <p className="text-xs text-muted mb-3">{t.report.subtitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {metricRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/50 bg-panel-inner/50 px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted">{row.label}</p>
              <p className={`text-sm font-semibold tabular-nums mt-1 ${row.className}`}>
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showPerCoin && (
        <div>
          <h4 className="text-xs font-semibold text-gray-200 mb-2">{t.report.perCoinTitle}</h4>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-panel-inner/60 text-muted">
                  <th className="text-left py-2 px-3 font-medium">{t.report.coin}</th>
                  <th className="text-right py-2 px-2 font-medium">{t.report.tradesCol}</th>
                  <th className="text-right py-2 px-2 font-medium">{t.report.pnlCol}</th>
                  <th className="text-right py-2 px-3 font-medium">{t.report.maxDdCol}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.perCoin.map((row) => (
                  <tr key={row.symbol} className="border-t border-border/30">
                    <td className="py-2 px-3 text-gray-200 font-medium">
                      {row.symbol.replace("USDT", "")}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-muted">
                      {row.closedTrades}
                    </td>
                    <td
                      className={`py-2 px-2 text-right tabular-nums font-medium ${
                        row.netPnlUsd >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtUsd(row.netPnlUsd)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-red-400/90">
                      -{row.maxDrawdownPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMonthly && (
        <div>
          <h4 className="text-xs font-semibold text-gray-200 mb-2">{t.report.monthlyTitle}</h4>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-panel-inner/60 text-muted">
                  <th className="text-left py-2 px-3 font-medium">{t.report.monthCol}</th>
                  <th className="text-right py-2 px-2 font-medium">{t.report.tradesCol}</th>
                  <th className="text-right py-2 px-2 font-medium">{t.report.pnlCol}</th>
                  <th className="text-right py-2 px-3 font-medium">{t.report.pnlPctCol}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthly.map((row) => (
                  <tr key={row.month} className="border-t border-border/30">
                    <td className="py-2 px-3 text-gray-200">
                      {formatMonth(row.month, locale)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-muted">
                      {row.trades}
                    </td>
                    <td
                      className={`py-2 px-2 text-right tabular-nums font-medium ${
                        row.netPnlUsd >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtUsd(row.netPnlUsd)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums ${
                        row.pnlPct >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtPct(row.pnlPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
