"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PricingTierGrid } from "@/components/PricingTierGrid";
import {
  planByTier,
  type PlanTier,
  type SubscriptionPlan,
} from "@/lib/subscriptionTiers";

export function PricingWithCheckout() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        setLoggedIn(Boolean(data.user));
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));
  }, []);

  function startCheckout(tier: PlanTier) {
    const plan = planByTier(tier);
    if (!plan || plan.comingSoon || tier === "trial") return;

    if (!loggedIn) {
      router.push(`/register?plan=${tier}&next=/pricing`);
      return;
    }

    setError(null);
    setSuccess(null);
    setCheckoutPlan(plan);
  }

  async function confirmCheckout() {
    if (!checkoutPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: checkoutPlan.tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка оплаты");

      setCheckoutPlan(null);
      setSuccess(`Тариф ${checkoutPlan.name} активирован — открываем аккаунт…`);
      setTimeout(() => router.push("/account"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100 text-center mb-6">
          {success}
        </div>
      )}

      {!authReady ? (
        <p className="text-center text-muted text-sm py-10">Загрузка тарифов…</p>
      ) : (
        <PricingTierGrid onPurchase={startCheckout} />
      )}

      <CheckoutModal
        open={checkoutPlan != null}
        plan={checkoutPlan}
        loading={loading}
        error={error}
        onClose={() => {
          if (!loading) {
            setCheckoutPlan(null);
            setError(null);
          }
        }}
        onConfirm={confirmCheckout}
      />
    </>
  );
}
