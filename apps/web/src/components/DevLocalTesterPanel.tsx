"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/clientFetch";

const PLANS = [
  { id: "trial", label: "Пробный" },
  { id: "basic", label: "Basic" },
  { id: "pro", label: "Pro" },
] as const;

/** Проход по оплате для своего аккаунта: выключить тариф или открыть «Ок» без ввода карты. */
export function DevLocalTesterPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/preview-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      window.location.href = "/pricing";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  }

  function openPayment(tier: (typeof PLANS)[number]["id"]) {
    window.location.href = `/pricing?checkout=${tier}`;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm space-y-3">
      <p className="text-muted text-xs leading-relaxed">
        Выключение снимает тариф и карту и открывает оплату. Выбор тарифа тоже открывает оплату:
        там кнопка «Ок», без ввода карты. После «Ок» подписка включена и карта привязана.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void turnOff()}
          className="text-sm text-muted hover:text-white disabled:opacity-50"
        >
          Выключить подписку
        </button>
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled={busy}
            onClick={() => openPayment(plan.id)}
            className="text-sm text-muted hover:text-white disabled:opacity-50"
          >
            {plan.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-300 text-xs">{error}</p>}
    </div>
  );
}
