import type { BacktestParams } from "@/lib/types";

const STORAGE_KEY = "reboundlab-backtest-params-v2";

export function loadSavedParams(fallback: BacktestParams): BacktestParams {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<BacktestParams> & {
      entry_pct_major?: number;
      entry_pct_alt?: number;
    };
    const merged = { ...fallback, ...parsed };
    if (parsed.entry_pct_major != null && parsed.entry_pct_regular == null) {
      merged.entry_pct_regular = parsed.entry_pct_major;
    }
    if (parsed.entry_pct_alt != null && parsed.entry_pct_meme == null) {
      merged.entry_pct_meme = parsed.entry_pct_alt;
    }
    return merged;
  } catch {
    return fallback;
  }
}

export function saveParams(params: BacktestParams): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore storage errors
  }
}
