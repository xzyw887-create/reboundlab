import type { BacktestParams } from "@/lib/types";

export type PresetId =
  | "custom"
  | "automatic"
  | "standard"
  | "calm"
  | "aggressive"
  | "trailing_tight";

export interface StrategyPreset {
  id: PresetId;
  label: string;
  description: string;
  /** Partial params applied on top of current (dates/symbols preserved) */
  patch: Partial<BacktestParams>;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "custom",
    label: "Свои настройки",
    description: "То, что вы настроили вручную",
    patch: {},
  },
  {
    id: "automatic",
    label: "Automatic",
    description:
      "Режим подбора: вы задаёте рамки (🔒), падение · TP · трейлинг подберёт программа (🔄). Нажмите кнопку Automatic.",
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
      max_open_trades: null,
    },
  },
  {
    id: "standard",
    label: "Стандарт",
    description: "Баланс: вход 10%, плечо 5×, TP 2%, усреднения",
    patch: {
      entry_pct: 10,
      leverage: 5,
      drop_pct: 1,
      tp: 2,
      trailing: false,
      trailing_activation: 2,
      trailing_callback: 2,
      averaging_enabled: true,
      entry_prices_total: 3,
      averaging_drops: [5, 10, 15],
      averaging_margins: [10, 10, 10],
      entry_pct_split: false,
      max_open_trades: null,
    },
  },
  {
    id: "calm",
    label: "Спокойный",
    description: "Меньше риска: 5% вход, 3× плечо, реже входы",
    patch: {
      entry_pct: 5,
      leverage: 3,
      drop_pct: 2,
      tp: 2,
      trailing: false,
      averaging_enabled: true,
      entry_prices_total: 2,
      averaging_drops: [5, 10],
      averaging_margins: [5, 5],
      entry_pct_split: true,
      entry_pct_regular: 5,
      entry_pct_meme: 3,
      max_open_trades: 2,
    },
  },
  {
    id: "aggressive",
    label: "Агрессивный",
    description: "Чаще входы, 10× плечо, трейлинг 0.5/0.1",
    patch: {
      entry_pct: 10,
      leverage: 10,
      drop_pct: 1,
      tp: 2,
      trailing: true,
      trailing_activation: 0.5,
      trailing_callback: 0.1,
      averaging_enabled: true,
      entry_prices_total: 3,
      averaging_drops: [5, 10, 15],
      averaging_margins: [10, 10, 10],
      entry_pct_split: true,
      entry_pct_regular: 10,
      entry_pct_meme: 5,
      max_open_trades: 5,
    },
  },
  {
    id: "trailing_tight",
    label: "Трейлинг",
    description: "Только трейлинг: активация 1%, откат 0.3%",
    patch: {
      entry_pct: 10,
      leverage: 5,
      drop_pct: 1,
      tp: 2,
      trailing: true,
      trailing_activation: 1,
      trailing_callback: 0.3,
      averaging_enabled: false,
      entry_pct_split: false,
      max_open_trades: 3,
    },
  },
];

const PRESET_STORAGE_KEY = "reboundlab-preset-id";

/** Пресеты в выпадающем списке (Automatic — отдельная кнопка «Скоро») */
export const ACTIVE_STRATEGY_PRESETS = STRATEGY_PRESETS.filter(
  (p) => p.id !== "automatic"
);

export function loadSavedPreset(): PresetId {
  if (typeof window === "undefined") return "custom";
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (raw === "automatic") return "custom";
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
  return {
    ...current,
    ...preset.patch,
    // never overwrite user's coin/date selection
    symbols: current.symbols,
    excluded_symbols: current.excluded_symbols,
    start_date: current.start_date,
    end_date: current.end_date,
    mode: current.mode,
    data_source: current.data_source,
  };
}
