"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { downloadTradesCsv, tradeNetPnlUsd } from "@/lib/exportTradesCsv";
import { readTradesExport, clearTradesExport, type TradesExportPayload } from "@/lib/tradesExportSession";
import { formatTpl, useLocale } from "@/lib/i18n";
import type { Trade } from "@/lib/types";

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatTime(iso: string, locale: "en" | "ru"): string {
  return new Date(iso).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pnlClass(value: number): string {
  return value >= 0 ? "text-green-400" : "text-red-400";
}

function TradesExportPage() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const [payload] = useState<TradesExportPayload | null>(() => readTradesExport(key));

  useEffect(() => {
    return () => {
      clearTradesExport(key);
    };
  }, [key]);

  if (!payload?.trades.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-pro max-w-md w-full">
          <div className="card-pro-body text-center space-y-3 py-10">
            <p className="text-sm text-gray-200">{t.exportPage.empty}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/app" className="btn-primary px-4 py-2 text-sm">
                {t.exportPage.backToTerminal}
              </Link>
              <button
                type="button"
                onClick={() => window.close()}
                className="btn-ghost px-4 py-2 text-sm"
              >
                {t.exportPage.closeTab}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { trades, filename, periodStart, periodEnd } = payload;
  const cols = t.exportPage.columns;

  return (
    <div className="min-h-screen bg-surface text-gray-100">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-surface/95 backdrop-blur px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-base font-semibold text-white">{t.exportPage.title}</h1>
            {(periodStart || periodEnd) && (
              <p className="text-xs text-muted">
                {formatTpl(t.exportPage.period, {
                  start: periodStart ?? "—",
                  end: periodEnd ?? "—",
                })}
              </p>
            )}
            <p className="text-xs text-muted">
              {formatTpl(t.exportPage.tradesCount, { count: String(trades.length) })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Link href="/app" className="btn-ghost px-4 py-2 text-sm">
              {t.exportPage.backToTerminal}
            </Link>
            <button
              type="button"
              onClick={() => downloadTradesCsv(trades, filename)}
              className="btn-primary px-4 py-2 text-sm"
            >
              {t.exportPage.downloadCsv}
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="btn-ghost px-4 py-2 text-sm"
            >
              {t.exportPage.closeTab}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-panel/80 text-muted">
              <tr>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">{cols.symbol}</th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">{cols.opened}</th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">{cols.closed}</th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">{cols.status}</th>
                <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">{cols.reason}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.entry}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.exit}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.avg}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.leverage}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.margin}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.pnl}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.netPnl}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.fees}</th>
                <th className="py-2.5 px-3 text-right font-medium whitespace-nowrap">{cols.funding}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {trades.map((trade: Trade, i: number) => {
                const net = tradeNetPnlUsd(trade);
                return (
                  <tr key={`${trade.opened_at}-${trade.symbol ?? i}`} className="hover:bg-panel/40">
                    <td className="py-2 px-3 whitespace-nowrap">{trade.symbol ?? "—"}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{formatTime(trade.opened_at, locale)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {trade.closed_at ? formatTime(trade.closed_at, locale) : "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{trade.status}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{trade.close_reason ?? "—"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatPrice(trade.entry_price)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {trade.exit_price != null ? formatPrice(trade.exit_price) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatPrice(trade.avg_price)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{trade.leverage}x</td>
                    <td className="py-2 px-3 text-right tabular-nums">{trade.total_margin.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right tabular-nums ${pnlClass(trade.pnl_usd)}`}>
                      {trade.pnl_usd >= 0 ? "+" : ""}
                      {trade.pnl_usd.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right tabular-nums ${pnlClass(net)}`}>
                      {net >= 0 ? "+" : ""}
                      {net.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{trade.fees_paid.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {(trade.funding_paid ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default function TradesExportPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TradesExportPage />
    </Suspense>
  );
}
