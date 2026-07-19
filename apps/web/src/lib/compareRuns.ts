import type { BacktestParams, BacktestResult } from "@/lib/types";

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

export function paramsSummary(p: BacktestParams): string {
  const parts = [
    `${p.entry_pct}%×${p.leverage}x`,
    `drop ${p.drop_pct}%`,
    p.trailing ? `trail ${p.trailing_activation}/${p.trailing_callback}` : `TP ${p.tp}%`,
  ];
  if (p.max_open_trades) parts.push(`макс.откр ${p.max_open_trades}`);
  if (p.entry_pct_split)
    parts.push(`обычн ${p.entry_pct_regular}%/мем ${p.entry_pct_meme}%`);
  return parts.join(" · ");
}
