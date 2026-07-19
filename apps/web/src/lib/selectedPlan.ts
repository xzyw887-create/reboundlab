import type { BacktestParams } from "@/lib/types";
import {
  featuresForTier,
  planByTier,
  type PlanTier,
} from "@/lib/subscriptionTiers";

const STORAGE_KEY = "reboundlab-plan-tier";

export function loadSelectedPlan(): PlanTier {
  if (typeof window === "undefined") return "trial";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && planByTier(raw as PlanTier)) return raw as PlanTier;
  } catch {
    // ignore
  }
  return "trial";
}

export function saveSelectedPlan(tier: PlanTier): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // ignore
  }
}

/** Подгоняет параметры под лимиты тарифа (UI + отправка на бэкенд). */
export function clampParamsToPlan(
  params: BacktestParams,
  tier: PlanTier
): BacktestParams {
  const f = featuresForTier(tier);
  const next: BacktestParams = { ...params };

  if (!f.multiCoin) {
    next.mode = "single";
    const first = next.symbols.find((s) => !next.excluded_symbols.includes(s));
    next.symbols = [first ?? next.symbols[0] ?? "BTCUSDT"];
    next.max_open_trades = null;
  } else if (next.symbols.length > f.maxCoins) {
    next.symbols = next.symbols.slice(0, f.maxCoins);
  }

  if (!f.trailing) {
    next.trailing = false;
  }

  if (f.averagingMaxLegs <= 0) {
    next.averaging_enabled = false;
  } else {
    const maxPrices = Math.min(4, f.averagingMaxLegs + 1) as 2 | 3 | 4;
    if (next.entry_prices_total > maxPrices) {
      next.entry_prices_total = maxPrices;
    }
  }

  if (!f.entryPctSplit) {
    next.entry_pct_split = false;
  }

  return next;
}

export function planDisplayName(tier: PlanTier): string {
  return planByTier(tier)?.name ?? tier;
}

export function requiredPlanLabel(feature: "multi" | "trailing" | "averaging" | "split" | "compare"): string {
  switch (feature) {
    case "multi":
    case "trailing":
    case "averaging":
    case "split":
      return "Pro";
    case "compare":
      return "Basic";
  }
}
