"use client";

import type { SavedRun } from "@/lib/compareRuns";
import { paramsSummary } from "@/lib/compareRuns";

interface Props {
  slotA: SavedRun | null;
  slotB: SavedRun | null;
  onSaveA: () => void;
  onSaveB: () => void;
  onClearA: () => void;
  onClearB: () => void;
  canSave: boolean;
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function row(
  label: string,
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  better?: "higher" | "lower" | null
) {
  const aStr = a ?? "—";
  const bStr = b ?? "—";
  const aNum = typeof a === "number" ? a : null;
  const bNum = typeof b === "number" ? b : null;
  let aClass = "";
  let bClass = "";
  if (better && aNum != null && bNum != null && aNum !== bNum) {
    const aWins = better === "higher" ? aNum > bNum : aNum < bNum;
    aClass = aWins ? "text-green-400" : "text-muted";
    bClass = !aWins ? "text-green-400" : "text-muted";
  }
  return (
    <tr className="border-t border-border/40">
      <td className="py-2 pr-3 text-muted text-xs">{label}</td>
      <td className={`py-2 px-2 text-right text-sm font-medium ${aClass || "text-white"}`}>
        {aStr}
      </td>
      <td className={`py-2 pl-2 text-right text-sm font-medium ${bClass || "text-white"}`}>
        {bStr}
      </td>
    </tr>
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
}: Props) {
  const hasCompare = slotA && slotB;

  return (
    <div className="card-pro">
      <div className="card-pro-body space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="label-caps text-center sm:text-left">Сравнение</p>
            <h2 className="font-semibold text-white">Два прогона рядом</h2>
            <p className="text-xs text-muted mt-1 max-w-xl">
              Запустите бэктест → «Сохранить A». Поменяйте настройки → снова запустите →
              «Сохранить B». Пресет — готовый набор цифр одной кнопкой (монеты и даты не
              меняет).
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={!canSave}
              onClick={onSaveA}
              className="btn-ghost disabled:opacity-40"
            >
              Сохранить A
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={onSaveB}
              className="btn-ghost disabled:opacity-40"
            >
              Сохранить B
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-border/60 p-3 bg-panel-inner">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-accent">Прогон A</span>
              {slotA && (
                <button type="button" onClick={onClearA} className="text-muted hover:text-red-400">
                  очистить
                </button>
              )}
            </div>
            {slotA ? (
              <>
                <p className="text-muted">{paramsSummary(slotA.params)}</p>
                <p className="text-muted/80 mt-1">
                  {slotA.params.start_date} — {slotA.params.end_date} ·{" "}
                  {slotA.params.symbols.map((s) => s.replace("USDT", "")).join(", ")}
                </p>
              </>
            ) : (
              <p className="text-muted">Пусто</p>
            )}
          </div>
          <div className="rounded-xl border border-border/60 p-3 bg-panel-inner">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sky-300">Прогон B</span>
              {slotB && (
                <button type="button" onClick={onClearB} className="text-muted hover:text-red-400">
                  очистить
                </button>
              )}
            </div>
            {slotB ? (
              <>
                <p className="text-muted">{paramsSummary(slotB.params)}</p>
                <p className="text-muted/80 mt-1">
                  {slotB.params.start_date} — {slotB.params.end_date} ·{" "}
                  {slotB.params.symbols.map((s) => s.replace("USDT", "")).join(", ")}
                </p>
              </>
            ) : (
              <p className="text-muted">Пусто</p>
            )}
          </div>
        </div>

        {hasCompare && (
          <div className="overflow-x-auto rounded-xl border border-border/40 bg-panel-inner p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps">
                  <th className="text-left py-1">Метрика</th>
                  <th className="text-right py-1 text-accent">A</th>
                  <th className="text-right py-1 text-sky-300">B</th>
                </tr>
              </thead>
              <tbody>
                {row(
                  "Итог ($)",
                  slotA.result.summary.realized_balance?.toFixed(2) ??
                    slotA.result.summary.final_balance.toFixed(2),
                  slotB.result.summary.realized_balance?.toFixed(2) ??
                    slotB.result.summary.final_balance.toFixed(2),
                  "higher"
                )}
                {row(
                  "Прибыль %",
                  fmtPct(
                    slotA.result.summary.realized_pnl_pct ??
                      slotA.result.summary.final_pnl_pct
                  ),
                  fmtPct(
                    slotB.result.summary.realized_pnl_pct ??
                      slotB.result.summary.final_pnl_pct
                  ),
                  "higher"
                )}
                {row(
                  "Всего сделок",
                  slotA.result.summary.total_trades,
                  slotB.result.summary.total_trades
                )}
                {row(
                  "Закрыто",
                  slotA.result.summary.closed_trades ??
                    slotA.result.summary.total_trades -
                      slotA.result.summary.open_trades,
                  slotB.result.summary.closed_trades ??
                    slotB.result.summary.total_trades -
                      slotB.result.summary.open_trades
                )}
                {row(
                  "Открыто на конец",
                  slotA.result.summary.open_trades,
                  slotB.result.summary.open_trades,
                  "lower"
                )}
                {row(
                  "В плюсе",
                  slotA.result.summary.winning_trades,
                  slotB.result.summary.winning_trades,
                  "higher"
                )}
                {row(
                  "Ликвидация",
                  slotA.result.summary.liquidated ? "да" : "нет",
                  slotB.result.summary.liquidated ? "да" : "нет"
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
