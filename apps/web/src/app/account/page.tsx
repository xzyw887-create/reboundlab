"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { planByTier, type PlanTier } from "@/lib/subscriptionTiers";
import { planDisplayName } from "@/lib/selectedPlan";

interface AccountUser {
  email: string;
  planTier: PlanTier;
  trialExpired: boolean;
  expiresAt: string | null;
  registeredAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Загрузка…
      </div>
    );
  }

  const plan = planByTier(user.trialExpired ? "trial" : user.planTier);
  const statusLabel = user.trialExpired
    ? "Пробный период закончился"
    : user.planTier === "trial"
      ? "Пробный доступ"
      : "Активная подписка";

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-accent hover:text-accent/80">
            ← На главную
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-muted hover:text-accent"
          >
            Выйти
          </button>
        </div>

        <div className="card-pro">
          <div className="card-pro-body space-y-5">
            <div>
              <p className="label-caps text-accent/80">Аккаунт</p>
              <h1 className="text-xl font-semibold text-white mt-1">Мой тариф</h1>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">Email</dt>
                <dd className="text-white text-right break-all">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">Тариф</dt>
                <dd className="text-white font-medium">
                  {plan?.name ?? planDisplayName(user.planTier)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">Статус</dt>
                <dd
                  className={
                    user.trialExpired ? "text-amber-300" : "text-green-400"
                  }
                >
                  {statusLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                <dt className="text-muted">Регистрация</dt>
                <dd className="text-white">{formatDate(user.registeredAt)}</dd>
              </div>
              {user.expiresAt && user.planTier !== "trial" && (
                <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                  <dt className="text-muted">Подписка до</dt>
                  <dd className="text-white">{formatDate(user.expiresAt)}</dd>
                </div>
              )}
              {user.planTier === "trial" && user.expiresAt && (
                <div className="flex justify-between gap-4 border-b border-border/40 pb-3">
                  <dt className="text-muted">Пробный до</dt>
                  <dd className={user.trialExpired ? "text-amber-300" : "text-white"}>
                    {formatDate(user.expiresAt)}
                  </dd>
                </div>
              )}
            </dl>

            {user.trialExpired ? (
              <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-100 space-y-3">
                <p>
                  Пробный период закончился. Чтобы продолжить прогоны, выберите
                  тариф Basic или Pro.
                </p>
                <Link
                  href="/pricing"
                  className="btn-primary inline-flex w-full justify-center"
                >
                  Выбрать тариф
                </Link>
                <p className="text-xs text-amber-200/70 text-center">
                  Этап 1: оплата-заглушка — тариф активируется сразу
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/pricing"
                  className="block text-center text-sm text-accent hover:text-accent/80"
                >
                  Смотреть все тарифы
                </Link>
                <Link href="/app" className="btn-primary w-full text-center block">
                  Запустить бэктест
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
