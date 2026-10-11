import type { AuthUser } from "@/lib/auth";
import { ApiError, type ApiErrorCode } from "@/lib/apiErrors";
import { isLocalTestMode, LOCAL_TEST_TIER } from "@/lib/localTestMode";
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
  blockedCode: ApiErrorCode | null;
  isAuthenticated: boolean;
}

/** Тариф для серверной проверки запроса. */
export function resolveEffectiveSubscription(
  auth: AuthUser | null
): EffectiveSubscription {
  if (isLocalTestMode()) {
    if (!auth) {
      return {
        tier: "trial",
        registeredAt: null,
        blockedCode: null,
        isAuthenticated: false,
      };
    }
    return {
      tier: LOCAL_TEST_TIER,
      registeredAt: auth.registeredAt,
      blockedCode: null,
      isAuthenticated: true,
    };
  }

  if (auth?.trialExpired) {
    return {
      tier: "trial",
      registeredAt: auth.registeredAt,
      blockedCode: "TRIAL_EXPIRED",
      isAuthenticated: true,
    };
  }

  if (auth?.subscriptionExpired) {
    return {
      tier: auth.planTier,
      registeredAt: auth.registeredAt,
      blockedCode: "SUBSCRIPTION_EXPIRED",
      isAuthenticated: true,
    };
  }

  if (auth) {
    return {
      tier: auth.planTier,
      registeredAt: auth.registeredAt,
      blockedCode: null,
      isAuthenticated: true,
    };
  }

  // Гость: на сервере всегда лимиты Trial (демо без регистрации)
  return {
    tier: "trial",
    registeredAt: null,
    blockedCode: null,
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
): ApiError | null {
  const f = featuresForTier(tier);
  const planName = planByTier(tier)?.name ?? tier;

  if (params.automatic) {
    if (!f.automatic) {
      return new ApiError("AUTOMATIC_NOT_AVAILABLE");
    }
  }

  const symbols = activeSymbols({
    symbols: params.symbols ?? [],
    excluded_symbols: params.excluded_symbols ?? [],
  });

  if (symbols.length === 0) {
    return new ApiError("PICK_ONE_COIN");
  }

  if (params.mode === "multi" && !f.multiCoin) {
    return new ApiError("MULTI_PRO_ONLY");
  }

  if (symbols.length > f.maxCoins) {
    if (f.maxCoins === 1) {
      return new ApiError("MAX_COINS_ONE", { plan: planName });
    }
    return new ApiError("MAX_COINS", { plan: planName, max: String(f.maxCoins) });
  }

  if (params.trailing && !f.trailing) {
    return new ApiError("TRAILING_PRO_ONLY");
  }

  if (params.averaging_enabled) {
    if (f.averagingMaxLegs <= 0) {
      return new ApiError("AVERAGING_PRO_ONLY");
    }
    const legs = params.entry_prices_total ?? 2;
    const maxPrices = Math.min(4, f.averagingMaxLegs + 1) as number;
    if (legs > maxPrices) {
      return new ApiError("AVERAGING_MAX_LEGS", {
        plan: planName,
        max: String(f.averagingMaxLegs),
      });
    }
  }

  if (params.entry_pct_split && !f.entryPctSplit) {
    return new ApiError("ENTRY_SPLIT_PRO_ONLY");
  }

  return null;
}
