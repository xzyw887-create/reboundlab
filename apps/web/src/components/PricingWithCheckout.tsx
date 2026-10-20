"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BillingIntervalSwitch } from "@/components/BillingIntervalSwitch";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PricingTierGrid } from "@/components/PricingTierGrid";
import { formatRubAmount } from "@/lib/billingCharge";
import { quoteCheckoutAmount } from "@/lib/billingCheckoutAmount";
import type { BillingInterval } from "@/lib/billingInterval";
import { displayMonthlyRub } from "@/lib/billingInterval";
import { localizedPlans } from "@/lib/localizedPlans";
import { paidTierState } from "@/lib/pricingEligibility";
import {
  planByTier,
  type PlanTier,
  type SubscriptionPlan,
} from "@/lib/subscriptionTiers";
import { apiFetch } from "@/lib/clientFetch";
import { isTelegramPlaceholderEmail } from "@/lib/telegramIdentity";
import { formatTpl, useLocale } from "@/lib/i18n";

const PENDING_PAYMENT_KEY = "btp_pending_payment";

type BillingMode = { yookassa: boolean; checkoutStub: boolean };

type AuthSnapshot = {
  email?: string;
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
  trialStarted?: boolean;
  paymentMethodBound?: boolean;
  expiresAt: string | null;
  billingAnchorDay: number | null;
  devLocalTester?: boolean;
  flowPreview?: boolean;
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
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const paymentReturnStarted = useRef(false);
  const bindReturnStarted = useRef(false);

  function displayPlans(): SubscriptionPlan[] {
    return localizedPlans(t, locale).map((plan) => {
      if (plan.tier !== "basic" && plan.tier !== "pro") return plan;
      const catalog = planByTier(plan.tier)?.priceRub ?? 0;
      if (catalog <= 0) return plan;
      const showYear = billingInterval === "year";
      const monthly = displayMonthlyRub(catalog, billingInterval);
      return {
        ...plan,
        priceHeadline: formatRubAmount(monthly).replace(" ₽", ""),
        pricePeriod: showYear ? "₽ / мес · оплата за год" : plan.pricePeriod,
      };
    });
  }

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

  useEffect(() => {
    if (searchParams.get("bind") !== "return") return;
    if (!authReady || !loggedIn) return;
    if (bindReturnStarted.current) return;
    bindReturnStarted.current = true;
    setReturnPolling(true);
    void (async () => {
      try {
        const res = await apiFetch("/api/billing/bind/complete");
        const data = await res.json();
        if (res.ok && data.ready) {
          window.location.href = "/app";
          return;
        }
        setError("Привязка ещё не подтверждена. Обновите страницу через минуту.");
      } catch {
        setError(t.pricingUi.paymentError);
      } finally {
        setReturnPolling(false);
      }
    })();
  }, [searchParams, authReady, loggedIn, t.pricingUi.paymentError]);

  const previewCheckoutOpened = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady || !authUser?.flowPreview) return;
    const tier = searchParams.get("checkout");
    if (tier !== "trial" && tier !== "basic" && tier !== "pro") return;
    if (previewCheckoutOpened.current === tier) return;
    previewCheckoutOpened.current = tier;
    const plan = planByTier(tier);
    if (plan && !plan.comingSoon) setCheckoutPlan(plan);
  }, [authReady, authUser?.flowPreview, searchParams]);

  const needsReceiptEmail = Boolean(
    authUser?.email && isTelegramPlaceholderEmail(authUser.email)
  );

  async function saveReceiptEmail(e: React.FormEvent) {
    e.preventDefault();
    setReceiptBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: receiptEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);
      setAuthUser(data.user);
      setReceiptEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pricingUi.error);
    } finally {
      setReceiptBusy(false);
    }
  }

  async function bindTrialCard() {
    if (needsReceiptEmail) {
      setError(t.auth.receiptEmailHint);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "bank_card", purpose: "trial" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);
      if (typeof data.confirmationUrl === "string" && data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
        return;
      }
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pricingUi.error);
      setLoading(false);
    }
  }

  function startCheckout(tier: PlanTier) {
    if (tier === "trial") {
      if (!loggedIn) {
        router.push("/login?next=/pricing");
        return;
      }
      if (authUser?.flowPreview) {
        const plan = planByTier("trial");
        if (plan) setCheckoutPlan(plan);
        return;
      }
      void bindTrialCard();
      return;
    }

    const plan = displayPlans().find((p) => p.tier === tier) ?? planByTier(tier);
    if (!plan || plan.comingSoon) return;
    if (!authUser?.flowPreview && (tier === "basic" || tier === "pro")) {
      const st = paidTierState(tier, authUser);
      if (!st.enabled) return;
    }

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
    if (needsReceiptEmail) {
      setError(t.auth.receiptEmailHint);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (authUser?.flowPreview) {
        const res = await apiFetch("/api/billing/preview-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            tier: checkoutPlan.tier,
            interval: billingInterval,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);
        window.location.href = "/app";
        return;
      }

      if (billingMode.yookassa) {
        const interval =
          authUser &&
          authUser.planTier === "basic" &&
          !authUser.subscriptionExpired &&
          checkoutPlan.tier === "pro"
            ? "month"
            : billingInterval;

        const res = await apiFetch("/api/billing/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: checkoutPlan.tier, interval }),
          signal: AbortSignal.timeout(20_000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.pricingUi.paymentError);
        if (data.preview) {
          window.location.href = "/app";
          return;
        }

        persistPendingPaymentId(data.paymentId);
        window.location.href = data.confirmationUrl;
        return;
      }

      if (billingMode.checkoutStub) {
        const interval =
          authUser &&
          authUser.planTier === "basic" &&
          !authUser.subscriptionExpired &&
          checkoutPlan.tier === "pro"
            ? "month"
            : billingInterval;

        const res = await apiFetch("/api/subscription/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: checkoutPlan.tier, interval }),
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
      const timedOut =
        err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      setError(
        timedOut
          ? "Оплата не ответила. Нажмите «Оформить» ещё раз."
          : err instanceof Error
            ? err.message
            : t.pricingUi.error
      );
      setLoading(false);
    }
  }

  const useYookassa = Boolean(billingMode?.yookassa);

  let checkoutQuote: ReturnType<typeof quoteCheckoutAmount> | null = null;
  if (checkoutPlan && authUser && (checkoutPlan.tier === "basic" || checkoutPlan.tier === "pro")) {
    try {
      checkoutQuote = quoteCheckoutAmount(
        authUser,
        checkoutPlan.tier,
        authUser.planTier === "basic" &&
          !authUser.subscriptionExpired &&
          checkoutPlan.tier === "pro"
          ? "month"
          : billingInterval,
        Boolean(authUser.flowPreview)
      );
    } catch {
      checkoutQuote = null;
    }
  }

  const checkoutChargeLabel = checkoutQuote ? formatRubAmount(checkoutQuote.amountRub) : null;

  const hideBillingToggle =
    authUser &&
    !authUser.flowPreview &&
    ((authUser.planTier === "basic" && !authUser.subscriptionExpired) ||
      (authUser.planTier === "pro" && !authUser.subscriptionExpired));
  const showBillingToggle = !hideBillingToggle;

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
        <>
          {needsReceiptEmail && (
            <form onSubmit={saveReceiptEmail} className="max-w-md mx-auto mb-6 space-y-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted">{t.auth.emailLabel}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={receiptEmail}
                  onChange={(e) => setReceiptEmail(e.target.value)}
                  placeholder={t.auth.receiptEmailPlaceholder}
                />
                <span className="text-[11px] text-muted">{t.auth.receiptEmailHint}</span>
              </label>
              <button type="submit" className="btn-primary w-full" disabled={receiptBusy}>
                {receiptBusy ? t.auth.loading : t.auth.receiptEmailSave}
              </button>
            </form>
          )}
          {showBillingToggle && (
            <BillingIntervalSwitch value={billingInterval} onChange={setBillingInterval} />
          )}
          {authUser?.planTier === "basic" && !authUser.subscriptionExpired && (
            <p className="text-center text-xs text-muted mb-6 max-w-lg mx-auto">
              Апгрейд до Pro — доплата за оставшийся период; годовой тариф при апгрейде не
              применяется.
            </p>
          )}
          <PricingTierGrid
            onPurchase={startCheckout}
            plans={displayPlans()}
            pricingUser={authUser}
            loggedIn={loggedIn}
            devTester={Boolean(authUser?.flowPreview)}
          />
        </>
      )}

      <CheckoutModal
        open={checkoutPlan != null}
        plan={checkoutPlan}
        loading={loading}
        error={error}
        useYookassa={useYookassa}
        previewOk={Boolean(authUser?.flowPreview)}
        chargeOverride={checkoutChargeLabel}
        checkoutQuote={checkoutQuote}
        subscriptionExpiresAt={authUser?.expiresAt ?? null}
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
