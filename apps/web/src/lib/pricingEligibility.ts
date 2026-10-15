import { ApiError } from "@/lib/apiErrors";
import type { PlanTier } from "@/lib/subscriptionTiers";

export type PricingUserState = {
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
};

export type TierButtonState = {
  enabled: boolean;
  label?: string;
  hint?: string;
};

function onActiveTrial(u: PricingUserState): boolean {
  return u.planTier === "trial" && !u.trialExpired;
}

function onActivePaid(u: PricingUserState): boolean {
  if (u.planTier !== "basic" && u.planTier !== "pro") return false;
  return !u.subscriptionExpired;
}

export function trialTierState(
  loggedIn: boolean,
  user: PricingUserState | null
): TierButtonState {
  if (!loggedIn || !user) {
    return { enabled: true };
  }
  if (onActiveTrial(user)) {
    return {
      enabled: false,
      label: "Пробный период активен",
      hint: "Вы уже пользуетесь пробным доступом",
    };
  }
  if (onActivePaid(user)) {
    return {
      enabled: false,
      label: "Недоступно",
      hint: "На платном тарифе пробный период не подключается",
    };
  }
  if (user.trialExpired) {
    return {
      enabled: false,
      label: "Пробный период завершён",
      hint: "Выберите Basic или Pro",
    };
  }
  return { enabled: true };
}

export function paidTierState(
  target: "basic" | "pro",
  user: PricingUserState | null
): TierButtonState {
  if (!user) {
    return { enabled: true };
  }

  if (onActiveTrial(user)) {
    return { enabled: true };
  }

  if (onActivePaid(user) && user.planTier === "pro") {
    if (target === "basic") {
      return {
        enabled: false,
        label: "У вас Pro",
        hint: "Basic недоступен — в Pro уже всё из Basic и больше",
      };
    }
    return {
      enabled: false,
      label: "Ваш тариф",
      hint: "Сейчас у вас Pro",
    };
  }

  if (onActivePaid(user) && user.planTier === "basic") {
    if (target === "basic") {
      return {
        enabled: false,
        label: "Ваш тариф",
        hint: "Сейчас у вас Basic",
      };
    }
    return {
      enabled: true,
      label: "Перейти на Pro",
      hint: "Доплата за оставшийся период без переплаты",
    };
  }

  return { enabled: true };
}

/** Сервер: можно ли создать платёж на этот тариф */
export function assertCanPurchaseTier(
  user: PricingUserState,
  target: "basic" | "pro"
): void {
  const state = paidTierState(target, user);
  if (!state.enabled) {
    throw new ApiError("INVALID_REQUEST");
  }
}
