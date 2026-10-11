"use client";

import { apiFetch } from "@/lib/clientFetch";
import { useEffect, useState } from "react";
import type { PlanTier } from "@/lib/subscriptionTiers";

export interface SessionUser {
  id: string;
  email: string;
  telegramId?: number | null;
  telegramUsername?: string | null;
  telegramDisplayName?: string | null;
  planTier: PlanTier;
  trialExpired: boolean;
  expiresAt: string | null;
  registeredAt: string;
}

export function useAuthSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const isGuest = !user;
  const isTrialExpired = user?.trialExpired ?? false;
  const isTrialActive =
    !!user && user.planTier === "trial" && !user.trialExpired;
  const isPaid =
    !!user && !user.trialExpired && user.planTier !== "trial";

  return {
    user,
    loading,
    isGuest,
    isTrialActive,
    isTrialExpired,
    isPaid,
  };
}
