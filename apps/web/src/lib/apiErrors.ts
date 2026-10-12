import type { ApiLocale } from "@/lib/apiLocale";
import { trialCopy } from "@/lib/productPolicy";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "TRIAL_EXPIRED"
  | "SUBSCRIPTION_EXPIRED"
  | "PERIOD_REQUIRED"
  | "DATE_START_AFTER_END"
  | "DATE_OUT_OF_RANGE"
  | "NO_DATA_FOR_COINS"
  | "AUTOMATIC_NOT_AVAILABLE"
  | "PICK_ONE_COIN"
  | "MULTI_PRO_ONLY"
  | "MAX_COINS"
  | "MAX_COINS_ONE"
  | "TRAILING_PRO_ONLY"
  | "AVERAGING_PRO_ONLY"
  | "AVERAGING_MAX_LEGS"
  | "ENTRY_SPLIT_PRO_ONLY"
  | "INVALID_EMAIL"
  | "PASSWORD_TOO_SHORT"
  | "REGISTER_FAILED"
  | "LOGIN_AFTER_REGISTER_FAILED"
  | "INVALID_CREDENTIALS"
  | "LOGIN_FAILED"
  | "RESET_LINK_INVALID"
  | "EMAIL_ALREADY_REGISTERED"
  | "DISPOSABLE_EMAIL"
  | "SIGNUP_ALREADY_USED"
  | "TELEGRAM_AUTH_INVALID"
  | "TELEGRAM_NOT_CONFIGURED"
  | "LOGIN_USE_TELEGRAM"
  | "EMAIL_AUTH_DISABLED"
  | "TRIAL_ALREADY_CLAIMED"
  | "REGISTER_GENERIC"
  | "LOGIN_REQUIRED"
  | "INVALID_TIER"
  | "ACCOUNT_UPDATE_FAILED"
  | "UNAUTHORIZED"
  | "INVALID_PAYLOAD"
  | "MISSING_ID"
  | "INVALID_REQUEST"
  | "PAYMENT_PROVIDER_REQUIRED"
  | "CANCELLED"
  | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly vars: Record<string, string>;

  constructor(code: ApiErrorCode, vars: Record<string, string> = {}) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.vars = vars;
  }
}

type MsgVars = Record<string, string | number>;

const trialMsgs = trialCopy("ru");
const trialMsgsEn = trialCopy("en");

const MSGS: Record<ApiErrorCode, Record<ApiLocale, string>> = {
  AUTH_REQUIRED: {
    ru: trialMsgs.telegramTrialHint,
    en: trialMsgsEn.telegramTrialHint,
  },
  TRIAL_EXPIRED: {
    ru: "Пробный период закончился — выберите тариф Basic или Pro",
    en: "Trial ended — choose Basic or Pro",
  },
  SUBSCRIPTION_EXPIRED: {
    ru: "Подписка закончилась — продлите тариф Basic или Pro",
    en: "Subscription ended — renew Basic or Pro",
  },
  PERIOD_REQUIRED: {
    ru: "Укажите период теста",
    en: "Select a backtest date range",
  },
  DATE_START_AFTER_END: {
    ru: "Начало периода позже конца",
    en: "Start date is after end date",
  },
  DATE_OUT_OF_RANGE: {
    ru: "Период вне доступного диапазона ({from} — {to})",
    en: "Period is outside the allowed range ({from} — {to})",
  },
  NO_DATA_FOR_COINS: {
    ru: "Нет данных для выбранных монет в периоде {from} — {to}",
    en: "No data for selected coins in {from} — {to}",
  },
  AUTOMATIC_NOT_AVAILABLE: {
    ru: "Automatic скоро — недоступен на вашем тарифе",
    en: "Automatic is coming soon — not available on your plan",
  },
  PICK_ONE_COIN: {
    ru: "Выберите хотя бы одну монету",
    en: "Select at least one coin",
  },
  MULTI_PRO_ONLY: {
    ru: "Мульти — только тариф Pro",
    en: "Multi-coin mode requires Pro",
  },
  MAX_COINS: {
    ru: "На тарифе {plan} — максимум {max} монет",
    en: "Plan {plan} allows up to {max} coins",
  },
  MAX_COINS_ONE: {
    ru: "На тарифе {plan} — максимум 1 монета",
    en: "Plan {plan} allows 1 coin only",
  },
  TRAILING_PRO_ONLY: {
    ru: "Трейлинг TP — только тариф Pro",
    en: "Trailing TP requires Pro",
  },
  AVERAGING_PRO_ONLY: {
    ru: "Усреднения — только тариф Pro",
    en: "Averaging requires Pro",
  },
  AVERAGING_MAX_LEGS: {
    ru: "На тарифе {plan} — до {max} уровней усреднения",
    en: "Plan {plan} allows up to {max} averaging levels",
  },
  ENTRY_SPLIT_PRO_ONLY: {
    ru: "Разный % входа по типу монет — только тариф Pro",
    en: "Split entry % by coin type requires Pro",
  },
  INVALID_EMAIL: {
    ru: "Введите корректный email",
    en: "Enter a valid email address",
  },
  PASSWORD_TOO_SHORT: {
    ru: "Пароль — минимум 8 символов",
    en: "Password must be at least 8 characters",
  },
  REGISTER_FAILED: {
    ru: "Не удалось создать пользователя",
    en: "Could not create account",
  },
  LOGIN_AFTER_REGISTER_FAILED: {
    ru: "Ошибка входа после регистрации",
    en: "Sign-in failed after registration",
  },
  INVALID_CREDENTIALS: {
    ru: "Неверный email или пароль",
    en: "Invalid email or password",
  },
  LOGIN_FAILED: {
    ru: "Ошибка входа",
    en: "Sign-in failed",
  },
  RESET_LINK_INVALID: {
    ru: "Ссылка недействительна или истекла",
    en: "Link is invalid or expired",
  },
  EMAIL_ALREADY_REGISTERED: {
    ru: "Этот email уже зарегистрирован",
    en: "This email is already registered",
  },
  DISPOSABLE_EMAIL: {
    ru: "Временные почтовые ящики не принимаются — укажите обычный email",
    en: "Disposable email addresses are not allowed",
  },
  SIGNUP_ALREADY_USED: {
    ru: "С этого браузера уже была регистрация. Войдите в существующий аккаунт или оформите подписку",
    en: "This browser already has an account. Sign in or subscribe on that account",
  },
  TELEGRAM_AUTH_INVALID: {
    ru: "Не удалось подтвердить вход через Telegram — попробуйте ещё раз",
    en: "Could not verify Telegram sign-in — try again",
  },
  TELEGRAM_NOT_CONFIGURED: {
    ru: "Вход через Telegram временно недоступен",
    en: "Telegram sign-in is not available",
  },
  LOGIN_USE_TELEGRAM: {
    ru: "Этот аккаунт привязан к Telegram — войдите через кнопку Telegram",
    en: "This account uses Telegram — sign in with the Telegram button",
  },
  EMAIL_AUTH_DISABLED: {
    ru: "Вход только через Telegram — откройте страницу входа и нажмите кнопку Telegram",
    en: "Sign-in is Telegram only — use the Telegram button on the login page",
  },
  TRIAL_ALREADY_CLAIMED: {
    ru: "Этот Telegram уже использовал пробный период. Войдите в тот же аккаунт и оформите Basic или Pro",
    en: "This Telegram account already used the trial. Sign in and choose Basic or Pro",
  },
  REGISTER_GENERIC: {
    ru: "Ошибка регистрации",
    en: "Registration failed",
  },
  LOGIN_REQUIRED: {
    ru: "Войдите в аккаунт",
    en: "Please sign in",
  },
  INVALID_TIER: {
    ru: "Укажите тариф basic или pro",
    en: "Choose basic or pro plan",
  },
  ACCOUNT_UPDATE_FAILED: {
    ru: "Ошибка обновления аккаунта",
    en: "Could not update account",
  },
  UNAUTHORIZED: {
    ru: "Требуется вход",
    en: "Unauthorized",
  },
  INVALID_PAYLOAD: {
    ru: "Некорректные данные",
    en: "Invalid payload",
  },
  MISSING_ID: {
    ru: "Не указан id",
    en: "Missing id",
  },
  INVALID_REQUEST: {
    ru: "Некорректный запрос",
    en: "Invalid request",
  },
  PAYMENT_PROVIDER_REQUIRED: {
    ru: "Оплата только через платёжную систему на сайте",
    en: "Please complete checkout via the payment provider",
  },
  CANCELLED: {
    ru: "Отменено",
    en: "Cancelled",
  },
  UNKNOWN: {
    ru: "Неизвестная ошибка",
    en: "Unknown error",
  },
};

export function apiMessage(
  locale: ApiLocale,
  code: ApiErrorCode,
  vars: MsgVars = {}
): string {
  const template = MSGS[code]?.[locale] ?? MSGS[code]?.ru ?? MSGS.UNKNOWN[locale];
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export function resolveErrorMessage(locale: ApiLocale, err: unknown): string {
  if (err instanceof ApiError) {
    return apiMessage(locale, err.code, err.vars);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return apiMessage(locale, "UNKNOWN");
}
