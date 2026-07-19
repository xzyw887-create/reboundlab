import type { BacktestParams } from "@/lib/types";

export const DEFAULT_DROP_GRID = [2, 3, 5, 8];
export const DEFAULT_TP_GRID = [2, 3, 4, 5, 6, 8, 10];
export const DEFAULT_TRAIL_ACT_GRID = [3, 5, 8];
export const DEFAULT_TRAIL_CB_GRID = 2;
export const STAGE2_TRIAL_ESTIMATE = 6;

const AVG_DROP_PRESETS: Record<number, number[][]> = {
  1: [[3], [5], [8], [10], [15]],
  2: [[5, 10], [5, 15], [8, 15], [10, 15], [3, 10]],
  3: [[5, 10, 15], [3, 8, 15], [5, 10, 20], [8, 12, 18]],
};
const AVG_MARGIN_MULTIPLIERS = 3;

export function effectiveTpGrid(params: BacktestParams): number[] {
  const raw = params.auto_tp_grid;
  if (raw?.length) {
    return [...raw].sort((a, b) => a - b);
  }
  return [...DEFAULT_TP_GRID];
}

export function coreComboCount(trailing: boolean, tpCount = DEFAULT_TP_GRID.length): number {
  const drop = DEFAULT_DROP_GRID.length;
  if (trailing) {
    return drop * tpCount * DEFAULT_TRAIL_ACT_GRID.length * DEFAULT_TRAIL_CB_GRID;
  }
  return drop * tpCount;
}

function averagingComboCount(averagingEnabled: boolean, entryPricesTotal: number): number {
  if (!averagingEnabled) return 1;
  const legs = Math.max(0, Math.min(entryPricesTotal - 1, 3));
  if (legs < 1) return 1;
  const presets = AVG_DROP_PRESETS[legs] ?? AVG_DROP_PRESETS[1];
  return presets.length * AVG_MARGIN_MULTIPLIERS;
}

export function countTotalCombos(params: BacktestParams): number {
  const tpCount = effectiveTpGrid(params).length;
  return (
    coreComboCount(params.trailing, tpCount) *
    averagingComboCount(params.averaging_enabled, params.entry_prices_total)
  );
}

export function parseTpGridInput(text: string): number[] {
  const values = text
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 2 && n <= 15);
  return [...new Set(values)].sort((a, b) => a - b);
}

export function formatTpGrid(values: number[] | undefined | null): string {
  if (!values?.length) return "";
  return values.join(", ");
}

export function autoGridsPayload(params: BacktestParams) {
  const tp = effectiveTpGrid(params);
  return {
    tp_grid: tp,
    drop_grid: DEFAULT_DROP_GRID,
    trail_act_grid: DEFAULT_TRAIL_ACT_GRID,
    trail_cb_grid: [0.5, 1],
  };
}

/** Changes that alter grid size — resets trial count to 10%. */
export function autoTrialsGridKey(params: BacktestParams): string {
  return [
    params.trailing ? "t1" : "t0",
    params.averaging_enabled ? "a1" : "a0",
    params.entry_prices_total,
    effectiveTpGrid(params).join(","),
    params.auto_two_stage === false ? "s1" : "s2",
  ].join("|");
}
