"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";
import { planDisplayName } from "@/lib/selectedPlan";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/clientFetch";
import { useLocale } from "@/lib/i18n";
import { isTelegramPlaceholderEmail } from "@/lib/telegramIdentity";
import { DevLocalTesterPanel } from "@/components/DevLocalTesterPanel";
import { userAccountLoginLabel } from "@/lib/userDisplayName";

interface AccountUser {
  email: string;
  telegramId?: number | null;
  telegramUsername?: string | null;
  telegramDisplayName?: string | null;
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
  expiresAt: string | null;
  registeredAt: string;
  devLocalTester?: boolean;
  flowPreview?: boolean;
  paymentMethodBound?: boolean;
  paymentMethodTitle?: string | null;
  autopayEnabled?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function AccountPage() {
  const router = useRouter();
  const { t } = useLocale();
  const a = t.accountPage;
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState<"cancel" | "unlink" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    const enroll = new URLSearchParams(window.location.search).get("preview") === "1";
    const load = () =>
      apiFetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : { user: null }))
        .then((data) => {
          if (!data.user) {
            router.replace("/login?next=/account");
            return;
          }
          setUser(data.user);
          setLoading(false);
        })
        .catch(() => router.replace("/login?next=/account"));

    if (!enroll) {
      load();
      return;
    }
    apiFetch("/api/billing/preview-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enroll" }),
    })
      .finally(() => {
        window.history.replaceState(null, "", "/account");
        load();
      });
  }, [router]);

  async function billingAction(action: "cancel" | "unlink") {
    setBillingBusy(action);
    setBillingError(null);
    try {
      const res = await apiFetch("/api/billing/autopay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || a.loading);
      if (data.user) setUser(data.user);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : a.loading);
    } finally {
      setBillingBusy(null);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          {a.loading}
        </div>
        <SiteFooter />
      </div>
    );
  }

  const plan = planByTier(user.planTier);
  const loginDisplay = userAccountLoginLabel(user, a.loginViaTelegram);

  const loginLabel =
    user.telegramId && isTelegramPlaceholderEmail(user.email) ? a.loginMethod : a.email;

  const statusLabel = user.subscriptionExpired
    ? a.statusSubscriptionExpired
    : user.trialExpired
      ? a.statusTrialExpired
      : user.planTier === "trial"
        ? a.statusTrial
        : a.statusActive;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 landing-container py-10 sm:py-14 max-w-lg mx-auto w-full px-4">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={logout}
            className="text-sm text-muted hover:text-accent"
          >
            {a.logout}
          </button>
        </div>

        <div className="card-pro">
          <div className="card-pro-body space-y-5">
            <div>
              <p className="label-caps text-sky-300/90">{a.sectionLabel}</p>
              <h1 className="text-xl font-semibold text-white mt-1">{a.title}</h1>
            </div>

            {user.flowPreview && <DevLocalTesterPanel />}

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">{loginLabel}</dt>
                <dd className="text-white text-right break-all">{loginDisplay}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">{a.plan}</dt>
                <dd className="text-white font-medium">
                  {plan?.name ?? planDisplayName(user.planTier)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">{a.status}</dt>
                <dd
                  className={
                    user.trialExpired || user.subscriptionExpired
                      ? "text-amber-300"
                      : "text-green-400"
                  }
                >
                  {statusLabel}
                </dd>
              </div>
              {user.expiresAt && user.planTier !== "trial" && (
                <>
                  <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                    <dt className="text-muted">{a.subscriptionUntil}</dt>
                    <dd className="text-white">{formatDate(user.expiresAt)}</dd>
                  </div>
                </>
              )}
              {user.planTier === "trial" && user.expiresAt && (
                <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                  <dt className="text-muted">{a.trialUntil}</dt>
                  <dd className={user.trialExpired ? "text-amber-300" : "text-white"}>
                    {formatDate(user.expiresAt)}
                  </dd>
                </div>
              )}
            </dl>

            {billingError && <p className="text-sm text-red-300">{billingError}</p>}

            <button
              type="button"
              className="text-sm text-muted hover:text-white text-left disabled:opacity-60"
              disabled={billingBusy !== null}
              onClick={() => void billingAction("cancel")}
            >
              {a.cancelAutopay}
            </button>

            {user.trialExpired || user.subscriptionExpired ? (
              <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-100 space-y-3">
                <p>
                  {user.subscriptionExpired ? a.expiredSubscriptionBody : a.expiredTrialBody}
                </p>
                <Link
                  href="/pricing"
                  className="btn-primary inline-flex w-full justify-center"
                >
                  {a.choosePlan}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/app" className="btn-primary flex-1 text-center py-2.5">
                  {a.openTerminal}
                </Link>
                <Link
                  href="/pricing"
                  className="landing-btn-outline flex-1 text-center py-2.5 text-sm"
                >
                  {a.viewAllPlans}
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}