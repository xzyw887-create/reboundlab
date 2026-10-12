/**
 * Единый источник сроков и лимитов тарифов для логики, UI и юридических текстов.
 * Меняете здесь — обновляются пробный период в БД (trialPolicy), карточки тарифов и оферта.
 */

export const TRIAL_DURATION_DAYS = 1;

/** История на пробном тарифе: календарные дни назад от даты регистрации. */
export const TRIAL_HISTORY_DAYS = 90;

/** История на Basic / Pro (календарные дни). */
export const PAID_HISTORY_DAYS = 1095;

export type PolicyLocale = "ru" | "en";

function ruCalendarDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} календарный день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} календарных дня`;
  }
  return `${n} календарных дней`;
}

function enCalendarDays(n: number): string {
  return n === 1 ? "1 calendar day" : `${n} calendar days`;
}

/** Коротко для UI: «1 день», «3 дня», «5 дней». */
export function trialDurationShort(locale: PolicyLocale, days = TRIAL_DURATION_DAYS): string {
  if (locale === "en") {
    return days === 1 ? "1 day" : `${days} days`;
  }
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return `${days} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${days} дня`;
  }
  return `${days} дней`;
}

export function termsPricingTrialLine(locale: PolicyLocale): string {
  const days = TRIAL_DURATION_DAYS;
  if (locale === "ru") {
    return `Пробный период — ${ruCalendarDays(days)} с момента регистрации (тариф «Пробный»), если доступен.`;
  }
  return `Trial period — ${enCalendarDays(days)} from registration (Trial plan), when available.`;
}

function historyFromRegistration(locale: PolicyLocale, days: number): string {
  if (locale === "ru") {
    return `${days} дней истории с регистрации`;
  }
  return `${days} days of history from signup`;
}

function paidHistoryYearsLabel(locale: PolicyLocale): string {
  const years = Math.round(PAID_HISTORY_DAYS / 365);
  if (locale === "ru") return `Свечи до ${years} лет`;
  return `Candles up to ${years} years`;
}

export interface TrialCopyBundle {
  ctaTrial: string;
  trialNote: string;
  pricingLeadTrialPart: string;
  subscriptionFlowText: string;
  stepRegisterText: string;
  guestRunBlocked: string;
  registerSubtitle: string;
  signupCta: string;
  trialFaqA: string;
  howTrialStepText: string;
  pricingSubtitle: string;
  pricingFaqTrialA: string;
  /** FAQ «сколько длится пробный» (с упоминанием регистрации). */
  faqTrialDurationA: string;
  helpTrialBillingTopic: string;
  telegramTrialHint: string;
  metaDescriptionTrial: string;
  plansTrial: {
    pricePeriod: string;
    priceNote: string;
    trialAccessFeature: string;
    historyFeature: string;
  };
}

export function trialCopy(locale: PolicyLocale): TrialCopyBundle {
  const d = trialDurationShort(locale);
  const dEn = locale === "en" ? d : trialDurationShort("en");
  const historyTrial = historyFromRegistration(locale, TRIAL_HISTORY_DAYS);

  if (locale === "ru") {
    return {
      ctaTrial: `Начать — ${d} бесплатно`,
      trialNote: `${d} после регистрации · Без карты`,
      pricingLeadTrialPart: `${d} бесплатно, затем оплата — доступ сразу в аккаунте. Платёж по карте подключаем.`,
      subscriptionFlowText: `Регистрация → ${d} бесплатно → Basic или Pro в аккаунте. Без «лицензий на ПО» — просто доступ к терминалу.`,
      stepRegisterText: `${d} бесплатно, без карты`,
      guestRunBlocked: `Зарегистрируйтесь — ${d} бесплатного доступа, чтобы запускать бэктесты.`,
      registerSubtitle: `${d} пробного доступа — без карты`,
      signupCta: `Зарегистрироваться — ${d} бесплатно`,
      trialFaqA: `Да. После регистрации — ${d} бесплатного доступа без карты, затем Basic или Pro.`,
      howTrialStepText: `Вход через Telegram — ${d} пробного доступа без карты.`,
      pricingSubtitle: `${d} бесплатно — затем Basic или Pro`,
      pricingFaqTrialA: `${d} без карты. Затем Basic или Pro.`,
      faqTrialDurationA: `${d} после регистрации, без карты. Затем Basic или Pro.`,
      helpTrialBillingTopic: `${d} после регистрации. Оформление оплаты — заглушка до подключения платёжки.`,
      telegramTrialHint: `Войдите через Telegram — ${d} пробного доступа для новых аккаунтов`,
      metaDescriptionTrial: `Professional crypto strategy backtesting. ${dEn} free trial. Basic & Pro plans.`,
      plansTrial: {
        pricePeriod: d,
        priceNote: `Полный доступ ${d} — затем выберите тариф`,
        trialAccessFeature: `${d} бесплатного доступа`,
        historyFeature: historyTrial,
      },
    };
  }

  return {
    ctaTrial: `Start — ${d} free trial`,
    trialNote: `${d} trial after registration · No card required`,
    pricingLeadTrialPart:
      `${d} free trial, then checkout — access in your account right away. Card payments coming soon.`,
    subscriptionFlowText:
      `Register → ${d} trial → Basic or Pro in your account. Not a software license — terminal access only.`,
    stepRegisterText: `${d} free, no card`,
    guestRunBlocked: `Register for a ${d} free trial to run backtests.`,
    registerSubtitle: `${d} trial — no card required`,
    signupCta: `Sign up — ${d} free`,
    trialFaqA: `Yes. After sign-up you get ${d} free with no card, then Basic or Pro.`,
    howTrialStepText: `Sign in with Telegram — ${d} trial, no card.`,
    pricingSubtitle: `${d} free trial — then Basic or Pro`,
    pricingFaqTrialA: `${d} free, no card. After that choose Basic or Pro.`,
    faqTrialDurationA: `${d} after registration, no card. Then choose Basic or Pro.`,
    helpTrialBillingTopic: `${d} trial after registration. Checkout is a template until payment provider is connected.`,
    telegramTrialHint: `Sign in with Telegram — ${d} trial for new accounts`,
    metaDescriptionTrial: `Professional crypto strategy backtesting. ${d} free trial. Basic & Pro plans.`,
    plansTrial: {
      pricePeriod: d,
      priceNote: `Full access for ${d} — then choose a plan`,
      trialAccessFeature: `${d} free access`,
      historyFeature: historyTrial,
    },
  };
}

export { paidHistoryYearsLabel };
