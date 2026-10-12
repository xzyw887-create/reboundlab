"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { AuthPageShell } from "@/components/AuthPageShell";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { useLocale } from "@/lib/i18n";
import { apiFetch } from "@/lib/clientFetch";
import { showDevLocalAuthUi } from "@/lib/devLocalAuthFlags";

export function AuthForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const devLocalUi = showDevLocalAuthUi();

  async function devLocalLogin() {
    setDevLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/dev-local", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      window.location.href = next;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errorGeneric);
      setDevLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="card-pro w-full max-w-md">
        <div className="card-pro-body space-y-5">
          <div className="text-center space-y-2">
            <BrandLogo size="lg" className="mx-auto" />
            <h1 className="title-gradient text-xl">{t.auth.loginTitle}</h1>
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
              {error}
            </p>
          )}

          <TelegramLoginButton next={next} onError={setError} />

          {devLocalUi && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={devLocalLogin}
                disabled={devLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-border/80 text-sm font-medium text-muted hover:text-white hover:border-accent/50 transition disabled:opacity-50"
              >
                {devLoading ? t.auth.loading : t.auth.devLocalLogin}
              </button>
              <p className="text-[11px] text-muted text-center leading-snug">
                {t.auth.devLocalHint}
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthPageShell>
  );
}
