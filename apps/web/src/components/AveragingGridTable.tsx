"use client";

import { Fragment } from "react";
import {
  buildAveragingSearchGrid,
  coreComboCount,
  DEFAULT_TP_GRID,
  type AveragingSearchRow,
} from "@/lib/automaticEstimate";

interface PickedAveraging {
  drops: number[];
  margins: number[];
}

interface Props {
  extraLegs: number;
  entryPct: number;
  entryPricesTotal: number;
  /** Подобранные значения после Automatic */
  picked?: PickedAveraging | null;
  trailing?: boolean;
  tpGrid?: number[];
  totalCombos?: number;
  trialsToRun?: number;
  capped?: boolean;
}

function marginLabel(mult: number): string {
  if (mult === 0.5) return "½ входа";
  if (mult === 1) return "= вход";
  if (mult === 1.5) return "1.5× входа";
  return `×${mult}`;
}

function SearchTable({
  rows,
  extraLegs,
  picked,
}: {
  rows: AveragingSearchRow[];
  extraLegs: number;
  picked?: PickedAveraging | null;
}) {
  const isPickedRow = (row: AveragingSearchRow) => {
    if (!picked?.drops.length) return false;
    if (row.drops.length !== picked.drops.length) return false;
    if (!row.drops.every((d, i) => d === picked.drops[i])) return false;
    if (!picked.margins.length) return true;
    return row.margins.every(
      (m, i) => Math.abs(m - (picked.margins[i] ?? 0)) < 0.05
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-accent/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-accent/10 text-left text-muted">
            <th className="px-2 py-1.5 font-medium w-8" rowSpan={2}>
              #
            </th>
            {Array.from({ length: extraLegs }, (_, i) => (
              <th
                key={`h-${i}`}
                colSpan={2}
                className="px-2 py-1.5 font-medium border-l border-accent/20"
              >
                Усреднение {i + 1}
              </th>
            ))}
            <th
              className="px-2 py-1.5 font-medium border-l border-accent/20"
              rowSpan={2}
            >
              Коэфф. маржи
            </th>
          </tr>
          <tr className="bg-accent/5 text-left text-muted text-[10px]">
            {Array.from({ length: extraLegs }, (_, i) => (
              <Fragment key={`sub-${i}`}>
                <th className="px-2 py-1 font-normal border-l border-accent/20">
                  падение %
                </th>
                <th className="px-2 py-1 font-normal">% банка</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = isPickedRow(row);
            return (
              <tr
                key={row.id}
                className={
                  selected
                    ? "bg-green-950/40 text-green-200"
                    : "text-gray-300 even:bg-panel-inner/30"
                }
              >
                <td className="px-2 py-1.5 text-muted">{row.id}</td>
                {Array.from({ length: extraLegs }, (_, i) => (
                  <Fragment key={`${row.id}-${i}`}>
                    <td className="px-2 py-1.5 border-l border-accent/10">
                      −{row.drops[i] ?? "—"}%
                    </td>
                    <td className="px-2 py-1.5">{row.margins[i] ?? "—"}%</td>
                  </Fragment>
                ))}
                <td className="px-2 py-1.5 border-l border-accent/10 text-muted">
                  {marginLabel(row.marginMultiplier)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PickedTable({
  drops,
  margins,
  extraLegs,
  leverage,
}: {
  drops: number[];
  margins: number[];
  extraLegs: number;
  leverage: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-green-700/40">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-green-950/30 text-left text-green-300/90">
            <th className="px-3 py-2 font-medium">Уровень</th>
            <th className="px-3 py-2 font-medium">Падение от первого входа</th>
            <th className="px-3 py-2 font-medium">Маржа (% банка)</th>
            <th className="px-3 py-2 font-medium">Номинал</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: extraLegs }, (_, i) => (
            <tr key={i} className="text-gray-200 border-t border-green-900/30">
              <td className="px-3 py-2 font-medium">Усреднение {i + 1}</td>
              <td className="px-3 py-2">−{drops[i]}%</td>
              <td className="px-3 py-2">{margins[i]}%</td>
              <td className="px-3 py-2 text-muted">
                {(margins[i] * leverage).toFixed(0)}% банка при {leverage}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AveragingGridTable({
  extraLegs,
  entryPct,
  entryPricesTotal,
  picked,
  leverage = 5,
  mode = "search",
  trailing = false,
  tpGrid,
  totalCombos,
  trialsToRun,
  capped,
}: Props & { leverage?: number; mode?: "search" | "picked-only" }) {
  if (extraLegs < 1) return null;

  const searchRows = buildAveragingSearchGrid(entryPricesTotal, entryPct);
  const coreCount = coreComboCount(trailing, tpGrid?.length ?? DEFAULT_TP_GRID.length);
  const avgCount = searchRows.length;
  const gridTotal = totalCombos ?? coreCount * avgCount;
  const runCount = trialsToRun ?? gridTotal;

  if (mode === "picked-only" && picked?.drops.length) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-green-300 font-medium">Подобранные усреднения</p>
        <PickedTable
          drops={picked.drops}
          margins={picked.margins}
          extraLegs={extraLegs}
          leverage={leverage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 col-span-2">
      <p className="text-xs text-muted">
        {avgCount} вариантов усреднений × {coreCount} комбинаций (падение / TP
        {trailing ? " / трейлинг" : ""}) ={" "}
        <span className="text-gray-300">{gridTotal}</span> всего.
        {capped ? (
          <>
            {" "}
            Automatic посчитает{" "}
            <span className="text-accent">{runCount} случайных</span> из {gridTotal}.
          </>
        ) : (
          <> Переберём все {runCount} комбинаций.</>
        )}
        {picked?.drops.length ? (
          <span className="text-green-400"> Зелёная строка — лучший вариант.</span>
        ) : null}
      </p>
      <SearchTable rows={searchRows} extraLegs={extraLegs} picked={picked} />
    </div>
  );
}
