import type { ApiLocale } from "@/lib/apiLocale";
import { apiMessage } from "@/lib/apiErrors";
import { getAuthUser } from "@/lib/auth";
import { computeSelectedCoverage } from "@/lib/dateCoverage";
import { listSymbolsFromDb } from "@/lib/listSymbols";
import {
  tierHistoryWindow,
  validateBacktestDateRange,
  type PlanDateContext,
} from "@/lib/planDateLimits";
import {
  resolveEffectiveSubscription,
  validateBacktestFeatures,
} from "@/lib/subscriptionEnforcement";
import type { BacktestParams } from "@/lib/types";

export async function validateBacktestRequest(
  params: Partial<BacktestParams>,
  locale: ApiLocale
): Promise<string | null> {
  const auth = await getAuthUser();
  if (!auth) {
    return apiMessage(locale, "AUTH_REQUIRED");
  }

  const sub = resolveEffectiveSubscription(auth);

  if (sub.blockedCode) {
    return apiMessage(locale, sub.blockedCode);
  }

  const featureError = validateBacktestFeatures(params, sub.tier);
  if (featureError) {
    return apiMessage(locale, featureError.code, featureError.vars);
  }

  const symbols = params.symbols ?? [];
  const excluded = params.excluded_symbols ?? [];
  const start = params.start_date;
  const end = params.end_date;
  if (!start || !end) return apiMessage(locale, "PERIOD_REQUIRED");

  const planCtx: PlanDateContext = {
    tier: sub.tier,
    registeredAt: sub.registeredAt,
  };

  const catalog = (await listSymbolsFromDb()).symbols;
  const coverage = computeSelectedCoverage(symbols, excluded, catalog, planCtx);
  if (!coverage) {
    const window = tierHistoryWindow(planCtx);
    return apiMessage(locale, "NO_DATA_FOR_COINS", {
      from: window.from,
      to: window.to,
    });
  }

  const dateError = validateBacktestDateRange(start, end, coverage);
  if (dateError) {
    if (start > end) {
      return apiMessage(locale, "DATE_START_AFTER_END");
    }
    return apiMessage(locale, "DATE_OUT_OF_RANGE", {
      from: coverage.from,
      to: coverage.to,
    });
  }

  return null;
}
