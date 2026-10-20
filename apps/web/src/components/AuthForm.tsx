"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthPageShell } from "@/components/AuthPageShell";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { useLocale } from "@/lib/i18n";
import { apiFetch } from "@/lib/clientFetch";
import { pathAfterLogin } from "@/lib/postLoginPath";
import { showDevLocalAuthUi } from "@/lib/devLocalAuthFlags";
import { showEmailPasswordAuthUi } from "@/lib/emailPasswordAuthFlags";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode?: AuthMode;
}

export function AuthForm({ mode = "login" }: AuthFormProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const devLocalUi = showDevLocalAuthUi();
  const emailUi = showEmailPasswordAuthUi();
  const isRegister = mode === "register";

  useEffect(() => {
    if (isRegister) return;
    let cancelled = false;
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled || !data.user) return;
        window.location.href = pathAfterLogin(data.user, next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isRegister, next]);

  async function devLocalLogin() {
    setDevLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/dev-local", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      window.location.href = pathAfterLogin(data.user, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errorGeneric);
      setDevLoading(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || t.auth.errorGeneric;
        throw new Error(
          msg.includes("зарегистрирован") || msg.includes("registered")
            ? `${msg} ${t.auth.tryLogin}`
            : msg
        );
      }
      window.location.href = pathAfterLogin(data.user, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
      setEmailLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="card-pro w-full max-w-md">
        <div className="card-pro-body space-y-5">
          <div className="text-center space-y-2">
            <BrandLogo size="lg" className="mx-auto" />
            <h1 className="title-gradient text-xl">
              {isRegister ? t.auth.registerTitle : t.auth.loginTitle}
            </h1>
            {!isRegister && (
              <p className="text-sm text-muted">{t.auth.loginSubtitle}</p>
            )}
            {isRegister && (
              <p className="text-sm text-muted">{t.auth.registerSubtitle}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
              {error}
            </p>
          )}

          {emailUi && (
            <form onSubmit={submitEmail} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs text-muted">{t.auth.emailLabel}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted">{t.auth.passwordLabel}</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isRegister && (
                  <span className="text-[11px] text-muted">
                    {t.auth.passwordMinHint}
                  </span>
                )}
              </label>
              <button
                type="submit"
                disabled={emailLoading}
                className="btn-primary w-full"
              >
                {emailLoading
                  ? t.auth.loading
                  : isRegister
                    ? t.auth.createAccount
                    : t.auth.signIn}
              </button>
            </form>
          )}

          {emailUi && (
            <p className="text-center text-sm text-muted">
              {isRegister ? (
                <>
                  {t.auth.haveAccount}{" "}
                  <Link href="/login" className="text-accent hover:underline">
                    {t.auth.signIn}
                  </Link>
                </>
              ) : (
                <>
                  {t.auth.noAccount}{" "}
                  <Link
                    href="/register"
                    className="text-accent hover:underline"
                  >
                    {t.auth.signupCta}
                  </Link>
                </>
              )}
            </p>
          )}

          {emailUi && (
            <p className="text-center text-xs text-muted">{t.auth.orDivider}</p>
          )}

          {!emailUi && (
            <label className="block space-y-1">
              <span className="text-xs text-muted">{t.auth.emailLabel}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.receiptEmailPlaceholder}
              />
              <span className="text-[11px] text-muted">{t.auth.receiptEmailHint}</span>
            </label>
          )}

          <TelegramLoginButton next={next} onError={setError} receiptEmail={email} />

          <p className="text-center text-xs text-muted">
            <Link href="/forgot-password" className="hover:text-accent">
              {t.auth.forgotPassword}
            </Link>
          </p>

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
