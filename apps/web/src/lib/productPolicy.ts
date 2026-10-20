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
    return `Пробный период — ${ruCalendarDays(days)} после привязки карты (тариф «Пробный»). Если подписку не отменить, на следующий день списывается тариф «Базовый» — 490 ₽ в месяц.`;
  }
  return `Trial period — ${enCalendarDays(days)} after the card is linked (Trial plan). If the subscription is not cancelled, Basic is charged the next day at 490 ₽ per month.`;
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
      ctaTrial: `Пробные сутки с картой`,
      trialNote: `${d} после привязки карты · затем 490 ₽`,
      pricingLeadTrialPart: `Вход через Telegram, затем выбор тарифа. ${d} после привязки карты, на следующий день — 490 ₽, если подписку не отменить.`,
      subscriptionFlowText: `Telegram → выбор тарифа → карта. ${d} бесплатно, затем 490 ₽ в месяц, либо сразу Базовый или Про.`,
      stepRegisterText: `Вход через Telegram, затем выбор тарифа и карта`,
      guestRunBlocked: `Войдите через Telegram и выберите тариф, чтобы запускать бэктесты.`,
      registerSubtitle: `Почта для чеков. Вход — через Telegram. Тариф выбирается после входа.`,
      signupCta: `Войти через Telegram`,
      trialFaqA: `Сутки открываются после привязки карты. Если подписку не отменить, на следующий день списывается Базовый — 490 ₽ в месяц.`,
      howTrialStepText: `Вход через Telegram, привязка карты — ${d}, затем 490 ₽, если не отменить.`,
      pricingSubtitle: `Сутки с картой или сразу Базовый / Про`,
      pricingFaqTrialA: `${d} после привязки карты, затем 490 ₽ в месяц, если не отменить.`,
      faqTrialDurationA: `${d} после привязки карты. Затем 490 ₽ в месяц, если подписку не отменить.`,
      helpTrialBillingTopic: `${d} после привязки карты. Если не отменить, на следующий день — 490 ₽.`,
      telegramTrialHint: `Войдите через Telegram и выберите тариф`,
      metaDescriptionTrial: `Professional crypto strategy backtesting. ${dEn} free trial. Basic & Pro plans.`,
      plansTrial: {
        pricePeriod: d,
        priceNote: `${d} после привязки карты, затем 490 ₽ / мес`,
        trialAccessFeature: `${d} после привязки карты`,
        historyFeature: historyTrial,
      },
    };
  }

  return {
    ctaTrial: `1-day trial with a card`,
    trialNote: `${d} after the card is linked · then 490 ₽`,
    pricingLeadTrialPart:
      `Sign in with Telegram, then pick a plan. ${d} after the card is linked; 490 ₽ the next day if you do not cancel.`,
    subscriptionFlowText:
      `Telegram → pick a plan → card. ${d} free, then 490 ₽ per month, or pay for Basic or Pro now.`,
    stepRegisterText: `Telegram sign-in, then a plan and a card`,
    guestRunBlocked: `Sign in with Telegram and choose a plan to run backtests.`,
    registerSubtitle: `Email for receipts. Sign-in is Telegram. You choose a plan after that.`,
    signupCta: `Continue with Telegram`,
    trialFaqA: `The day starts after the card is linked. If you do not cancel, Basic is charged the next day — 490 ₽ per month.`,
    howTrialStepText: `Telegram sign-in and a linked card — ${d}, then 490 ₽ unless you cancel.`,
    pricingSubtitle: `1 day with a card, or Basic / Pro right away`,
    pricingFaqTrialA: `${d} after the card is linked, then 490 ₽ per month unless you cancel.`,
    faqTrialDurationA: `${d} after the card is linked. Then 490 ₽ per month unless you cancel.`,
    helpTrialBillingTopic: `${d} after the card is linked. 490 ₽ the next day if you do not cancel.`,
    telegramTrialHint: `Sign in with Telegram and choose a plan`,
    metaDescriptionTrial: `Professional crypto strategy backtesting. ${d} free trial. Basic & Pro plans.`,
    plansTrial: {
      pricePeriod: d,
      priceNote: `${d} after the card is linked, then 490 ₽ / mo`,
      trialAccessFeature: `${d} after the card is linked`,
      historyFeature: historyTrial,
    },
  };
}

export { paidHistoryYearsLabel };
