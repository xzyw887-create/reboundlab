import type { BacktestParams, BacktestResult } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/en";
import { formatTpl } from "@/lib/i18n";

const STORAGE_A = "reboundlab-compare-a";
const STORAGE_B = "reboundlab-compare-b";

export interface SavedRun {
  label: string;
  params: BacktestParams;
  result: BacktestResult;
  savedAt: string;
}

export function loadCompareSlot(slot: "A" | "B"): SavedRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(slot === "A" ? STORAGE_A : STORAGE_B);
    return raw ? (JSON.parse(raw) as SavedRun) : null;
  } catch {
    return null;
  }
}

export function saveCompareSlot(slot: "A" | "B", run: SavedRun): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(slot === "A" ? STORAGE_A : STORAGE_B, JSON.stringify(run));
  } catch {
    // ignore
  }
}

export function clearCompareSlot(slot: "A" | "B"): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(slot === "A" ? STORAGE_A : STORAGE_B);
}

export function paramsSummary(p: BacktestParams, t: Dictionary): string {
  const exit = p.trailing
    ? formatTpl(t.compareParams.trail, {
        act: p.trailing_activation,
        cb: p.trailing_callback,
      })
    : formatTpl(t.compareParams.tp, { tp: p.tp });
  const parts = [
    formatTpl(t.compareParams.summary, {
      entry: p.entry_pct,
      lev: p.leverage,
      drop: p.drop_pct,
      exit,
    }),
  ];
  if (p.max_open_trades) {
    parts.push(formatTpl(t.compareParams.maxOpen, { n: p.max_open_trades }));
  }
  if (p.entry_pct_split) {
    parts.push(
      formatTpl(t.compareParams.split, {
        reg: p.entry_pct_regular,
        mem: p.entry_pct_meme,
      })
    );
  }
  return parts.join(" · ");
}
