import type { BacktestParams } from "@/lib/types";
import {
  autoTrialsGridKey,
  countTotalCombos,
  STAGE2_TRIAL_ESTIMATE,
} from "@/lib/autoGrids";

export { autoTrialsGridKey, countTotalCombos } from "@/lib/autoGrids";
export {
  DEFAULT_DROP_GRID,
  DEFAULT_TP_GRID,
  effectiveTpGrid,
  formatTpGrid,
  parseTpGridInput,
  autoGridsPayload,
  coreComboCount,
} from "@/lib/autoGrids";

export const AUTO_TRIALS_DEFAULT_RATIO = 0.1;

export function defaultAutoTrials(totalCombos: number): number {
  return Math.max(1, Math.floor(totalCombos * AUTO_TRIALS_DEFAULT_RATIO));
}

const SECONDS_PER_TRIAL_BASE = 1.35;

function dayCountFromRange(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 30;
  return Math.max(1, Math.ceil((b - a) / 86400000));
}

export function resolveAutoTrials(
  params: BacktestParams,
  requested?: number
): { totalCombos: number; trials: number; capped: boolean; runAll: boolean } {
  const totalCombos = countTotalCombos(params);
  const raw =
    requested ?? params.auto_trials ?? defaultAutoTrials(totalCombos);
  const trials = Math.max(1, Math.min(totalCombos, Math.floor(raw)));
  return {
    totalCombos,
    trials,
    capped: trials < totalCombos,
    runAll: trials >= totalCombos,
  };
}

export function estimateAutomaticSeconds(
  params: BacktestParams,
  trials: number
): number {
  const activeSymbols = params.symbols.filter(
    (s) => !params.excluded_symbols.includes(s)
  );
  const symbolCount = Math.max(1, activeSymbols.length);
  const days = dayCountFromRange(params.start_date, params.end_date);
  const twoStage = params.auto_two_stage !== false;
  const stage2 = twoStage ? STAGE2_TRIAL_ESTIMATE : 0;

  const loadOverhead = 8 + symbolCount * 2.5 + days / 45;
  const perTrial =
    SECONDS_PER_TRIAL_BASE *
    (1 + symbolCount * 0.45 + days / 100 + (params.mode === "multi" ? 0.35 : 0));

  return loadOverhead + (trials + stage2) * perTrial;
}

export function formatDurationRu(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  if (sec < 60) return `${sec} сек`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m} мин`;
  return `${m} мин ${s} сек`;
}

export function formatElapsedProgress(
  elapsedSec: number,
  estimatedSec: number,
  trials: number,
  totalCombos?: number,
  capped?: boolean
): string {
  const elapsed = formatDurationRu(elapsedSec);
  const eta = Math.max(0, estimatedSec - elapsedSec);
  const remaining = formatDurationRu(eta);
  const trialLabel =
    capped && totalCombos && totalCombos > trials
      ? `${trials} из ${totalCombos}`
      : `${trials}`;
  return `${trialLabel} вариантов · прошло ${elapsed} · осталось ~${remaining}`;
}

const AVG_DROP_PRESETS: Record<number, number[][]> = {
  1: [[3], [5], [8], [10], [15]],
  2: [[5, 10], [5, 15], [8, 15], [10, 15], [3, 10]],
  3: [[5, 10, 15], [3, 8, 15], [5, 10, 20], [8, 12, 18]],
};
const AVG_MARGIN_MULTIPLIERS = [0.5, 1, 1.5];

export interface AveragingSearchRow {
  id: number;
  drops: number[];
  margins: number[];
  marginMultiplier: number;
}

export function buildAveragingSearchGrid(
  entryPricesTotal: number,
  entryPct: number
): AveragingSearchRow[] {
  const legs = Math.max(0, Math.min(entryPricesTotal - 1, 3));
  if (legs < 1) return [];

  const presets = AVG_DROP_PRESETS[legs] ?? AVG_DROP_PRESETS[1];
  const rows: AveragingSearchRow[] = [];
  let id = 1;
  for (const drops of presets) {
    for (const mult of AVG_MARGIN_MULTIPLIERS) {
      const margin = Math.round(entryPct * mult * 10) / 10;
      rows.push({
        id: id++,
        drops: [...drops],
        margins: drops.map(() => margin),
        marginMultiplier: mult,
      });
    }
  }
  return rows;
}
