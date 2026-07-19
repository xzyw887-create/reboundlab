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
  pricePeriod?: string;
  priceNote?: string;
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
    pricePeriod: "3 дня",
    priceNote: "Полный доступ на 3 дня — потом выберите тариф",
    trialDays: 3,
    accent: "muted",
    cta: "Начать пробный период",
    ctaHref: "/register",
    features: {
      maxCoins: 1,
      maxDays: 90,
      trialDays: 3,
      trailing: false,
      averagingMaxLegs: 0,
      multiCoin: false,
      compareRuns: false,
      automatic: false,
      entryPctSplit: false,
    },
    featureItems: [
      { label: "3 дня бесплатного доступа", included: true },
      { label: "1 монета", included: true },
      { label: "Вход, TP, SL, плечо", included: true },
      { label: "Комиссия 0.05% и funding Binance", included: true },
      { label: "История 3 месяца с даты регистрации", included: true },
      { label: "Несколько монет на одном банке", included: false },
      { label: "Усреднения", included: false },
      { label: "Трейлинг Take Profit", included: false },
      { label: "Automatic — подбор параметров", included: false },
    ],
  },
  {
    tier: "basic",
    dbTier: "starter",
    name: "Basic",
    tagline: "Классика",
    priceRub: 990,
    priceRubLabel: "990",
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
      { label: "1 монета на счёт", included: true },
      { label: "Свечи до 3 лет (или с листинга монеты)", included: true },
      { label: "Неограниченные прогоны", included: true },
      { label: "Сравнение прогонов A / B", included: true },
      { label: "Комиссия 0.05% и funding", included: true },
      { label: "Несколько монет (кросс-банк)", included: false },
      { label: "Усреднения до 3 уровней", included: false },
      { label: "Трейлинг Take Profit", included: false },
      { label: "Automatic", included: false },
    ],
  },
  {
    tier: "pro",
    dbTier: "pro",
    name: "Pro",
    tagline: "Полная стратегия",
    priceRub: 2990,
    priceRubLabel: "2 990",
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
      { label: "До 10 монет на одном банке", included: true },
      { label: "Кросс-маржа и лимит сделок", included: true },
      { label: "Усреднения до 3 уровней", included: true },
      { label: "Трейлинг Take Profit", included: true },
      { label: "Разный %: обычные / мемы", included: true },
      { label: "Свечи до 3 лет (или с листинга монеты)", included: true },
      { label: "Сравнение A / B", included: true },
      { label: "Automatic", included: false },
    ],
  },
  {
    tier: "automatic",
    dbTier: "automatic",
    name: "Automatic",
    tagline: "ИИ-подбор",
    priceRub: 7990,
    priceRubLabel: "7 990",
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
      { label: "Автоподбор падения и TP", included: true },
      { label: "Подбор трейлинга и усреднений", included: true },
      { label: "Исключение монет с ликвидацией", included: true },
      { label: "Два этапа: грубо → уточнение", included: true },
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
