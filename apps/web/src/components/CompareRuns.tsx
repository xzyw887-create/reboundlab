"use client";

import type { SavedRun } from "@/lib/compareRuns";
import { paramsSummary } from "@/lib/compareRuns";
import { StrategyCompareColumn, RunSummaryCard } from "@/components/StrategyCompareColumn";
import { useLocale } from "@/lib/i18n";
import { closedOnlySummary } from "@/lib/closedOnlySummary";
import type { Dictionary } from "@/lib/i18n/en";

interface Props {
  slotA: SavedRun | null;
  slotB: SavedRun | null;
  onSaveA: () => void;
  onSaveB: () => void;
  onClearA: () => void;
  onClearB: () => void;
  canSave: boolean;
  compareActive: boolean;
  onCompare: () => void;
  onExitCompare: () => void;
  onResetAll: () => void;
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function metricRows(run: SavedRun, t: Dictionary) {
  const s = run.result.summary;
  const { balance, pnlPct } = closedOnlySummary(s);
  return [
    {
      label: t.compare.resultUsd,
      value: balance.toFixed(2),
    },
    {
      label: t.compare.profitPct,
      value: fmtPct(pnlPct),
    },
    { label: t.compare.totalTrades, value: String(s.total_trades) },
    {
      label: t.compare.closed,
      value: String(s.closed_trades ?? s.total_trades - s.open_trades),
    },
    { label: t.compare.openAtEnd, value: String(s.open_trades) },
    { label: t.compare.winning, value: String(s.winning_trades) },
    {
      label: t.compare.liquidation,
      value: s.liquidated ? t.compare.yes : t.compare.no,
    },
  ];
}

function StrategyMetricsTable({ run }: { run: SavedRun }) {
  const { t } = useLocale();
  const rows = metricRows(run, t);

  return (
    <div className="mt-3 rounded-lg border border-border/40 bg-panel/40 overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border/30 first:border-t-0">
              <td className="py-2 pl-3 pr-2 text-muted text-xs leading-snug">{row.label}</td>
              <td className="py-2 pr-3 text-right text-sm font-medium text-white tabular-nums whitespace-nowrap">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StrategySlotCard({
  slot,
  variant,
  onClear,
  showMetrics,
}: {
  slot: SavedRun | null;
  variant: "a" | "b";
  onClear: () => void;
  showMetrics: boolean;
}) {
  const { t } = useLocale();
  const border = "border-accent/30";
  const titleClass = "text-accent";
  const title = variant === "a" ? t.compare.strategyA : t.compare.strategyB;

  return (
    <div className={`rounded-xl border ${border} p-3 bg-panel-inner h-full`}>
      <div className="flex justify-between items-center gap-2">
        <span className={`font-semibold ${titleClass}`}>{title}</span>
        {slot && (
          <button
            type="button"
            onClick={onClear}
            className="btn-ghost px-2 py-1 text-xs text-muted hover:text-red-400 hover:border-red-500/40 shrink-0"
          >
            {t.compare.cancel}
          </button>
        )}
      </div>
      {slot ? (
        <>
          <p className="text-xs text-muted mt-1">{paramsSummary(slot.params, t)}</p>
          <p className="text-[10px] text-muted/80 mt-0.5">
            {slot.params.start_date} — {slot.params.end_date} ·{" "}
            {slot.params.symbols.map((s) => s.replace("USDT", "")).join(", ")}
          </p>
          {showMetrics ? (
            <StrategyMetricsTable run={slot} />
          ) : (
            <RunSummaryCard run={slot} />
          )}
        </>
      ) : (
        <p className="text-muted text-sm mt-2">{t.compare.empty}</p>
      )}
    </div>
  );
}

export function CompareRuns({
  slotA,
  slotB,
  onSaveA,
  onSaveB,
  onClearA,
  onClearB,
  canSave,
  compareActive,
  onCompare,
  onExitCompare,
  onResetAll,
}: Props) {
  const { t } = useLocale();
  const hasBoth = Boolean(slotA && slotB);
  const hasAny = Boolean(slotA || slotB);

  return (
    <div className="card-pro">
      <div className="card-pro-body space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
            {hasAny && (
              <button
                type="button"
                onClick={onResetAll}
                className="btn-ghost text-muted hover:text-red-400 hover:border-red-500/40"
              >
                {t.compare.resetAll}
              </button>
            )}
            <button
              type="button"
              disabled={!canSave}
              onClick={onSaveA}
              className="btn-ghost disabled:opacity-40"
            >
              {t.compare.saveA}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={onSaveB}
              className="btn-ghost disabled:opacity-40"
            >
              {t.compare.saveB}
            </button>
            {hasBoth && !compareActive && (
              <button type="button" onClick={onCompare} className="btn-primary px-4 py-2 text-sm">
                {t.compare.compareBtn}
              </button>
            )}
            {compareActive && (
              <button type="button" onClick={onExitCompare} className="btn-ghost">
                {t.compare.cancel}
              </button>
            )}
        </div>

        {compareActive && hasBoth && slotA && slotB ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <StrategySlotCard
                slot={slotA}
                variant="a"
                onClear={onClearA}
                showMetrics
              />
              <StrategySlotCard
                slot={slotB}
                variant="b"
                onClear={onClearB}
                showMetrics
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <StrategyCompareColumn run={slotA} />
              <StrategyCompareColumn run={slotB} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <StrategySlotCard
              slot={slotA}
              variant="a"
              onClear={onClearA}
              showMetrics={false}
            />
            <StrategySlotCard
              slot={slotB}
              variant="b"
              onClear={onClearB}
              showMetrics={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
