"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

type AuthSnapshot = {
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
};

function persistPendingPaymentId(id: string) {
  sessionStorage.setItem(PENDING_PAYMENT_KEY, id);
  try {
    localStorage.setItem(PENDING_PAYMENT_KEY, id);
  } catch {
    /* private mode */
  }
}

function clearPendingPaymentId() {
  sessionStorage.removeItem(PENDING_PAYMENT_KEY);
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    /* ignore */
  }
}

function readPendingPaymentId(searchParams: URLSearchParams): string | null {
  const fromUrl = searchParams.get("id")?.trim();
  if (fromUrl) return fromUrl;
  const fromSession = sessionStorage.getItem(PENDING_PAYMENT_KEY);
  if (fromSession) return fromSession;
  try {
    return localStorage.getItem(PENDING_PAYMENT_KEY);
  } catch {
    return null;
  }
}

function goToTerminal() {
  window.location.replace("/app");
}

function hasActivePaidPlan(user: AuthSnapshot | null): boolean {
  if (!user || user.trialExpired || user.subscriptionExpired) return false;
  return user.planTier === "basic" || user.planTier === "pro";
}

export function PricingWithCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthSnapshot | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [returnPolling, setReturnPolling] = useState(false);
  const paymentReturnStarted = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        const u = data.user as AuthSnapshot | null;
        setLoggedIn(Boolean(u));
        setAuthUser(u);
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));

    fetch("/api/billing/config")
      .then((r) => r.json())
      .then((data: BillingMode) => setBillingMode(data))
      .catch(() => setBillingMode({ yookassa: false, checkoutStub: false }));
  }, []);

  const pollPaymentReturn = useCallback(async () => {
    const paymentId = readPendingPaymentId(searchParams);
    if (!paymentId) {
      if (hasActivePaidPlan(authUser)) {
        goToTerminal();
        return;
      }
      setError("Не найден id платежа. Если оплата прошла — откройте терминал из меню или напишите в поддержку.");
      return;
    }

    setReturnPolling(true);
    setError(null);

    for (let i = 0; i < 24; i++) {
      const res = await apiFetch(`/api/billing/payment?id=${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (res.ok && data.activated) {
        clearPendingPaymentId();
        setReturnPolling(false);
        goToTerminal();
        return;
      }
      if (hasActivePaidPlan(authUser)) {
        clearPendingPaymentId();
        setReturnPolling(false);
        goToTerminal();
        return;
      }
      await new Promise((r) => setTimeout(r, 2500));
      const me = await fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));
      const u = me.user as AuthSnapshot | null;
      if (u) setAuthUser(u);
      if (hasActivePaidPlan(u)) {
        clearPendingPaymentId();
        setReturnPolling(false);
        goToTerminal();
        return;
      }
    }

    setReturnPolling(false);
    if (hasActivePaidPlan(authUser)) {
      goToTerminal();
      return;
    }
    setError(
      "Оплата ещё обрабатывается. Обновите страницу через минуту или откройте /app — если тариф уже Pro/Basic."
    );
  }, [authUser, searchParams, t.pricingUi.activated]);

  useEffect(() => {
    if (searchParams.get("payment") !== "return") return;
    if (!authReady || !loggedIn) return;
    if (paymentReturnStarted.current) return;
    paymentReturnStarted.current = true;

    if (hasActivePaidPlan(authUser)) {
      clearPendingPaymentId();
      goToTerminal();
      return;
    }
    void pollPaymentReturn();
  }, [searchParams, authReady, loggedIn, authUser, pollPaymentReturn]);

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

        persistPendingPaymentId(data.paymentId);
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
        setLoading(false);
        goToTerminal();
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
