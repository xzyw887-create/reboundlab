import type { PlanTier } from "@/lib/subscriptionTiers";

/** Локальная база с полным backfill — все монеты и реальные даты без лимита Trial. */
export function isLocalTestMode(): boolean {
  return process.env.NEXT_PUBLIC_LOCAL_TEST_MODE === "1";
}

export const LOCAL_TEST_TIER: PlanTier = "pro";
