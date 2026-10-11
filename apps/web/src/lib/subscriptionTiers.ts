/**
 * Единый источник тарифов — UI, лендинг и будущие feature flags (M06).
 * Синхронизировать с database/schemas/01_core.sql → core.plans
 */

export type PlanTier = "trial" | "basic" | "pro" | "automatic";

export interface PlanFeatures {
  maxCoins: number;
  maxDays: number;
  trialDays?: number;
  trailing: boolean;
  averagingMaxLegs: number;
  multiCoin: boolean;
  compareRuns: boolean;
  automatic: boolean;
  entryPctSplit: boolean;
}

export interface PlanFeatureItem {
  label: string;
  included: boolean;
}

export interface SubscriptionPlan {
  tier: PlanTier;
  dbTier: "trial" | "starter" | "pro" | "automatic";
  name: string;
  tagline: string;
  priceRub: number;
  priceRubLabel: string;
  /** USD reference for EN UI (not billing currency until Stripe USD) */
  priceUsdLabel: string;
  pricePeriod?: string;
  priceNote?: string;
  /** Large price on card (set by localizedPlans) */
  priceHeadline?: string;
  /** e.g. EN: "Billed in rubles: 490 ₽" */
  priceBillingLine?: string;
  /** Extra pitch on pricing card (e.g. Automatic) */
  cardBlurb?: string;
  trialDays?: number;
  highlighted?: boolean;
  comingSoon?: boolean;
  accent?: "cyan" | "violet" | "gold" | "muted";
  cta: string;
  ctaHref: string;
  features: PlanFeatures;
  featureItems: PlanFeatureItem[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "trial",
    dbTier: "trial",
    name: "Пробный",
    tagline: "Без карты",
    priceRub: 0,
    priceRubLabel: "0 ₽",
    priceUsdLabel: "Free",
    pricePeriod: "1 день",
    priceNote: "Полный доступ 1 день — затем Basic или Pro",
    trialDays: 1,
    accent: "muted",
    cta: "Начать пробный период",
    ctaHref: "/login",
    features: {
      maxCoins: 1,
      maxDays: 90,
      trialDays: 1,
      trailing: false,
      averagingMaxLegs: 0,
      multiCoin: false,
      compareRuns: false,
      automatic: false,
      entryPctSplit: false,
    },
    featureItems: [
      { label: "1 день бесплатного доступа", included: true },
      { label: "Одиночный · одна монета", included: true },
      { label: "Вход, TP, SL, плечо", included: true },
      { label: "Подсчёт комиссий и фандинга", included: true },
      { label: "90 дней истории с регистрации", included: true },
      { label: "Мульти · Pro", included: false },
      { label: "Усреднения (DCA)", included: false },
      { label: "Трейлинг TP", included: false },
      { label: "Automatic — подбор параметров", included: false },
    ],
  },
  {
    tier: "basic",
    dbTier: "starter",
    name: "Basic",
    tagline: "Классика",
    priceRub: 490,
    priceRubLabel: "490",
    priceUsdLabel: "$5",
    pricePeriod: "₽ / мес",
    priceNote: "Оплата через ЮKassa",
    accent: "cyan",
    cta: "Выбрать Basic",
    ctaHref: "/pricing#basic",
    features: {
      maxCoins: 1,
      maxDays: 1095,
      trailing: false,
      averagingMaxLegs: 0,
      multiCoin: false,
      compareRuns: true,
      automatic: false,
      entryPctSplit: false,
    },
    featureItems: [
      { label: "Одиночный · одна монета", included: true },
      { label: "Свечи до 3 лет", included: true },
      { label: "Неограниченные прогоны", included: true },
      { label: "Сравнение стратегий A / B", included: true },
      { label: "Подсчёт комиссий и фандинга", included: true },
      { label: "Мульти · Pro", included: false },
      { label: "Усреднения до 3 уровней", included: false },
      { label: "Трейлинг TP", included: false },
      { label: "Automatic", included: false },
    ],
  },
  {
    tier: "pro",
    dbTier: "pro",
    name: "Pro",
    tagline: "Полная стратегия",
    priceRub: 1990,
    priceRubLabel: "1 990",
    priceUsdLabel: "$20",
    pricePeriod: "₽ / мес",
    priceNote: "Оплата через ЮKassa",
    highlighted: true,
    accent: "violet",
    cta: "Выбрать Pro",
    ctaHref: "/pricing#pro",
    features: {
      maxCoins: 10,
      maxDays: 1095,
      trailing: true,
      averagingMaxLegs: 3,
      multiCoin: true,
      compareRuns: true,
      automatic: false,
      entryPctSplit: true,
    },
    featureItems: [
      { label: "Мульти · до 10 монет одновременно", included: true },
      { label: "Кросс-маржа: один банк на все монеты", included: true },
      { label: "Усреднения до 3 уровней", included: true },
      { label: "Трейлинг TP", included: true },
      { label: "Разный % входа по типу монет", included: true },
      { label: "Свечи до 3 лет", included: true },
      { label: "Сравнение стратегий A / B", included: true },
      { label: "Automatic", included: false },
    ],
  },
  {
    tier: "automatic",
    dbTier: "automatic",
    name: "Automatic",
    tagline: "ИИ-подбор",
    priceRub: 4990,
    priceRubLabel: "4 990",
    priceUsdLabel: "$50",
    pricePeriod: "₽ / мес",
    priceNote: "Ожидаемая цена",
    comingSoon: true,
    accent: "gold",
    cta: "Скоро",
    ctaHref: "/pricing",
    features: {
      maxCoins: 50,
      maxDays: 1095,
      trailing: true,
      averagingMaxLegs: 3,
      multiCoin: true,
      compareRuns: true,
      automatic: true,
      entryPctSplit: true,
    },
    featureItems: [
      { label: "Всё из тарифа Pro", included: true },
      { label: "Автоподбор drop %, TP, трейлинга и усреднений", included: true },
      { label: "Учёт банка и лимита одновременных сделок", included: true },
      { label: "Целевая доходность в % на периоде", included: true },
      { label: "Два этапа поиска: грубо → уточнение", included: true },
    ],
  },
];

export function planByTier(tier: PlanTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
}

export function featuresForTier(tier: PlanTier): PlanFeatures {
  return planByTier(tier)?.features ?? SUBSCRIPTION_PLANS[0].features;
}

export function featuresToDbJson(f: PlanFeatures): Record<string, unknown> {
  return {
    max_coins: f.maxCoins,
    max_days: f.maxDays,
    trial_days: f.trialDays,
    trailing: f.trailing,
    averaging: f.averagingMaxLegs,
    multi_coin: f.multiCoin,
    compare_runs: f.compareRuns,
    automatic: f.automatic,
    entry_pct_split: f.entryPctSplit,
  };
}
