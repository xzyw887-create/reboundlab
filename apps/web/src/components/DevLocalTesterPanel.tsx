"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/clientFetch";
import type { DevSubscriptionPreset } from "@/lib/devSubscriptionPreset";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { planDisplayName } from "@/lib/selectedPlan";

const PRESET_BUTTONS: { id: DevSubscriptionPreset; label: string }[] = [
  { id: "trial", label: "Trial активен" },
  { id: "trial_expired", label: "Trial истёк" },
  { id: "basic", label: "Basic активен" },
  { id: "basic_expired", label: "Basic истёк" },
  { id: "pro", label: "Pro активен" },
  { id: "pro_expired", label: "Pro истёк" },
];

type AuthSnapshot = {
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
  expiresAt: string | null;
};

interface Props {
  user: AuthSnapshot;
  onUpdated: (user: AuthSnapshot) => void;
}

export function DevLocalTesterPanel({ user, onUpdated }: Props) {
  const [busy, setBusy] = useState<DevSubscriptionPreset | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(preset: DevSubscriptionPreset) {
    setBusy(preset);
    setError(null);
    try {
      const res = await apiFetch("/api/dev/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      onUpdated(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  const status =
    user.subscriptionExpired || user.trialExpired
      ? "истёк"
      : user.planTier === "trial"
        ? "trial"
        : "активен";

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-4 py-4 text-sm space-y-3">
      <div>
        <p className="label-caps text-amber-200/90">Dev-local: симулятор подписки</p>
        <p className="text-muted text-xs mt-1 leading-relaxed">
          Только аккаунт без Telegram. Меняет тариф в БД, обходя продуктовые ограничения. На{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            /pricing
          </Link>{" "}
          кнопки оплаты тоже открыты для проверки текстов и checkout.
        </p>
      </div>
      <p className="text-xs text-muted">
        Сейчас: <strong className="text-white">{planDisplayName(user.planTier)}</strong> ({status}
        {user.expiresAt ? ` · до ${user.expiresAt.slice(0, 10)}` : ""})
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESET_BUTTONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            disabled={busy != null}
            onClick={() => void apply(id)}
            className="px-3 py-1.5 rounded-lg border border-amber-600/30 bg-black/25 text-amber-50 text-xs hover:bg-amber-900/35 disabled:opacity-50"
          >
            {busy === id ? "…" : label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-300 text-xs">{error}</p>}
    </div>
  );
}
