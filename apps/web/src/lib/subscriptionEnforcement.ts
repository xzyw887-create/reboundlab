import type { AuthUser } from "@/lib/auth";
import type { BacktestParams } from "@/lib/types";
import {
  featuresForTier,
  planByTier,
  type PlanTier,
} from "@/lib/subscriptionTiers";

export interface EffectiveSubscription {
  tier: PlanTier;
  registeredAt: string | null;
  /** Если не null — прогоны запрещены */
  blockedReason: string | null;
  isAuthenticated: boolean;
}

/** Тариф для серверной проверки запроса. */
export function resolveEffectiveSubscription(
  auth: AuthUser | null
): EffectiveSubscription {
  if (auth?.trialExpired) {
    return {
      tier: "trial",
      registeredAt: auth.registeredAt,
      blockedReason:
        "Пробный период закончился — выберите тариф Basic или Pro",
      isAuthenticated: true,
    };
  }

  if (auth) {
    return {
      tier: auth.planTier,
      registeredAt: auth.registeredAt,
      blockedReason: null,
      isAuthenticated: true,
    };
  }

  // Гость: на сервере всегда лимиты Trial (демо без регистрации)
  return {
    tier: "trial",
    registeredAt: null,
    blockedReason: null,
    isAuthenticated: false,
  };
}

function activeSymbols(params: Pick<BacktestParams, "symbols" | "excluded_symbols">): string[] {
  return params.symbols.filter((s) => !params.excluded_symbols.includes(s));
}

/** Проверка фич стратегии против тарифа. */
export function validateBacktestFeatures(
  params: Partial<BacktestParams>,
  tier: PlanTier
): string | null {
  const f = featuresForTier(tier);
  const planName = planByTier(tier)?.name ?? tier;

  if (params.automatic) {
    if (!f.automatic) {
      return "Automatic скоро — недоступен на вашем тарифе";
    }
  }

  const symbols = activeSymbols({
    symbols: params.symbols ?? [],
    excluded_symbols: params.excluded_symbols ?? [],
  });

  if (symbols.length === 0) {
    return "Выберите хотя бы одну монету";
  }

  if (params.mode === "multi" && !f.multiCoin) {
    return "Несколько монет на одном банке — только тариф Pro";
  }

  if (symbols.length > f.maxCoins) {
    return `На тарифе ${planName} — максимум ${f.maxCoins} ${
      f.maxCoins === 1 ? "монета" : "монет"
    }`;
  }

  if (params.trailing && !f.trailing) {
    return "Трейлинг Take Profit — только тариф Pro";
  }

  if (params.averaging_enabled) {
    if (f.averagingMaxLegs <= 0) {
      return "Усреднения — только тариф Pro";
    }
    const legs = params.entry_prices_total ?? 2;
    const maxPrices = Math.min(4, f.averagingMaxLegs + 1) as number;
    if (legs > maxPrices) {
      return `На тарифе ${planName} — до ${f.averagingMaxLegs} уровней усреднения`;
    }
  }

  if (params.entry_pct_split && !f.entryPctSplit) {
    return "Разный % для обычных монет и мемов — только тариф Pro";
  }

  return null;
}
