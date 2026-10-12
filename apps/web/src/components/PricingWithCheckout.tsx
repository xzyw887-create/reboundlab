"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PricingTierGrid } from "@/components/PricingTierGrid";
import { localizedPlans } from "@/lib/localizedPlans";
import {
  planByTier,
  type PlanTier,
  type SubscriptionPlan,
} from "@/lib/subscriptionTiers";
import { apiFetch } from "@/lib/clientFetch";
import { formatTpl, useLocale } from "@/lib/i18n";

const PENDING_PAYMENT_KEY = "btp_pending_payment";

type BillingMode = { yookassa: boolean; checkoutStub: boolean };

export function PricingWithCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [returnPolling, setReturnPolling] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        setLoggedIn(Boolean(data.user));
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));

    fetch("/api/billing/config")
      .then((r) => r.json())
      .then((data: BillingMode) => setBillingMode(data))
      .catch(() => setBillingMode({ yookassa: false, checkoutStub: false }));
  }, []);

  const pollPaymentReturn = useCallback(async () => {
    const paymentId = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    if (!paymentId) {
      setError("Не найден id платежа. Если оплата прошла — напишите в поддержку.");
      return;
    }

    setReturnPolling(true);
    setError(null);

    for (let i = 0; i < 24; i++) {
      const res = await apiFetch(`/api/billing/payment?id=${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (res.ok && data.activated) {
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        setSuccess(
          formatTpl(t.pricingUi.activated, {
            name: data.tier === "pro" ? "Pro" : "Basic",
          })
        );
        setReturnPolling(false);
        setTimeout(() => router.push("/app"), 900);
        return;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }

    setReturnPolling(false);
    setError(
      "Оплата ещё обрабатывается. Обновите страницу через минуту или напишите в поддержку с email аккаунта."
    );
  }, [router, t.pricingUi.activated]);

  useEffect(() => {
    if (searchParams.get("payment") !== "return") return;
    if (!loggedIn) return;
    void pollPaymentReturn();
  }, [searchParams, loggedIn, pollPaymentReturn]);

  function startCheckout(tier: PlanTier) {
    const plan = localizedPlans(t, locale).find((p) => p.tier === tier) ?? planByTier(tier);
    if (!plan || plan.comingSoon || tier === "trial") return;

    if (!loggedIn) {
      router.push(`/login?plan=${tier}&next=/pricing`);
      return;
    }

    setError(null);
    setSuccess(null);
    setCheckoutPlan(plan);
  }

  async function confirmCheckout() {
    if (!checkoutPlan || !billingMode) return;
    setLoading(true);
    setError(null);
    try {
      if (billingMode.yookassa) {
        const res = await apiFetch("/api/billing/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: checkoutPlan.tier }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);

        sessionStorage.setItem(PENDING_PAYMENT_KEY, data.paymentId);
        window.location.href = data.confirmationUrl;
        return;
      }

      if (billingMode.checkoutStub) {
        const res = await apiFetch("/api/subscription/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: checkoutPlan.tier }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);

        setCheckoutPlan(null);
        setSuccess(formatTpl(t.pricingUi.activated, { name: checkoutPlan.name }));
        setTimeout(() => router.push("/app"), 900);
        return;
      }

      throw new Error(t.pricingUi.paymentError);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pricingUi.error);
      setLoading(false);
    }
  }

  const useYookassa = Boolean(billingMode?.yookassa);

  return (
    <>
      {returnPolling && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-100 text-center mb-6">
          Проверяем оплату…
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100 text-center mb-6">
          {success}
        </div>
      )}

      {error && !checkoutPlan && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-200 text-center mb-6">
          {error}
        </div>
      )}

      {!authReady ? (
        <p className="text-center text-muted text-sm py-10">{t.pricingUi.loading}</p>
      ) : (
        <PricingTierGrid onPurchase={startCheckout} />
      )}

      <CheckoutModal
        open={checkoutPlan != null}
        plan={checkoutPlan}
        loading={loading}
        error={error}
        useYookassa={useYookassa}
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
