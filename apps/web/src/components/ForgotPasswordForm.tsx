"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { BrandLogo } from "@/components/BrandLogo";
import { apiFetch } from "@/lib/clientFetch";
import { useLocale } from "@/lib/i18n";

export function ForgotPasswordForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="card-pro w-full max-w-md">
        <div className="card-pro-body space-y-5">
          <div className="text-center space-y-2">
            <BrandLogo size="lg" className="mx-auto" />
            <h1 className="title-gradient text-xl">{t.auth.forgotTitle}</h1>
            <p className="text-sm text-muted">{t.auth.forgotHint}</p>
          </div>
          {sent ? (
            <p className="text-sm text-muted">{t.auth.forgotSent}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
                  {error}
                </p>
              )}
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
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t.auth.loading : t.auth.forgotSubmit}
              </button>
            </form>
          )}
          <p className="text-center text-sm">
            <Link href="/login" className="text-accent hover:underline">
              {t.auth.backToLogin}
            </Link>
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
}
