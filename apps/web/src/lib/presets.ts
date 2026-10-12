import type { BacktestParams } from "@/lib/types";

export type PresetId = "custom" | "automatic" | "calm" | "aggressive";

export interface StrategyPreset {
  id: PresetId;
  labelKey: "presetCustom" | "presetCalm" | "presetAggressive";
  descKey: "presetDescCustom" | "presetDescCalm" | "presetDescAggressive";
  patch: Partial<BacktestParams>;
}

/** Hidden from dropdown — used by Automatic flow only */
export const AUTOMATIC_PRESET: StrategyPreset = {
  id: "automatic",
  labelKey: "presetCustom",
  descKey: "presetDescCustom",
  patch: {
    entry_pct: 10,
    leverage: 5,
    drop_pct: 2,
    tp: 4,
    trailing: true,
    trailing_activation: 2,
    trailing_callback: 1,
    averaging_enabled: true,
    entry_prices_total: 3,
    averaging_drops: [5, 10, 15],
    averaging_margins: [10, 10, 10],
    entry_pct_split: false,
    max_open_trades: 2,
  },
};

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "custom",
    labelKey: "presetCustom",
    descKey: "presetDescCustom",
    patch: {},
  },
  {
    id: "calm",
    labelKey: "presetCalm",
    descKey: "presetDescCalm",
    patch: {
      entry_pct: 5,
      leverage: 2,
      drop_pct: 2.5,
      tp: 1.5,
      sl: 4,
      trailing: false,
      averaging_enabled: true,
      entry_prices_total: 2,
      averaging_drops: [4, 8],
      averaging_margins: [4, 4],
      entry_pct_split: false,
      max_open_trades: 2,
    },
  },
  {
    id: "aggressive",
    labelKey: "presetAggressive",
    descKey: "presetDescAggressive",
    patch: {
      entry_pct: 10,
      leverage: 10,
      drop_pct: 1.5,
      tp: 2.5,
      sl: 3,
      trailing: false,
      averaging_enabled: true,
      entry_prices_total: 2,
      averaging_drops: [3, 6],
      averaging_margins: [8, 8],
      entry_pct_split: false,
      max_open_trades: 2,
    },
  },
];

const PRESET_STORAGE_KEY = "reboundlab-preset-id";

export const ACTIVE_STRATEGY_PRESETS = STRATEGY_PRESETS;

export function loadSavedPreset(): PresetId {
  if (typeof window === "undefined") return "custom";
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (raw === "automatic") return "custom";
    if (raw === "standard" || raw === "trailing_tight") return "custom";
    if (raw && STRATEGY_PRESETS.some((p) => p.id === raw)) {
      return raw as PresetId;
    }
  } catch {
    // ignore
  }
  return "custom";
}

export function savePresetId(id: PresetId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function applyPreset(
  current: BacktestParams,
  presetId: PresetId
): BacktestParams {
  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
  if (!preset || presetId === "custom") return current;
  const mode = current.mode;
  const next: BacktestParams = {
    ...current,
    ...preset.patch,
    symbols: current.symbols,
    excluded_symbols: current.excluded_symbols,
    start_date: current.start_date,
    end_date: current.end_date,
    mode,
    data_source: current.data_source,
  };
  if (mode === "single") {
    next.max_open_trades = null;
  }
  return next;
}
