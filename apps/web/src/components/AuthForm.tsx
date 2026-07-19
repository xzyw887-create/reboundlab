"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
  mode: "login" | "register";
}

export function AuthForm({ mode }: Props) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Ошибка";
        if (msg.includes("уже зарегистрирован")) {
          throw new Error(`${msg}. Попробуйте войти.`);
        }
        throw new Error(msg);
      }
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card-pro w-full max-w-md">
        <div className="card-pro-body space-y-5">
          <div className="text-center space-y-2">
            <div className="logo-box mx-auto">BP</div>
            <h1 className="title-gradient text-xl">
              {isRegister ? "Регистрация" : "Вход"}
            </h1>
            <p className="text-sm text-muted">
              {isRegister
                ? "3 дня пробного доступа — без карты"
                : "BackTest Pro · Binance Futures"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Пароль</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isRegister && (
                <span className="text-[11px] text-muted">Минимум 8 символов</span>
              )}
            </label>

            {error && (
              <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? "…"
                : isRegister
                ? "Создать аккаунт"
                : "Войти"}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            {isRegister ? (
              <>
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Войти
                </Link>
              </>
            ) : (
              <>
                Нет аккаунта?{" "}
                <Link href="/register" className="text-accent hover:underline">
                  Регистрация — 3 дня бесплатно
                </Link>
              </>
            )}
          </p>

          <p className="text-center">
            <Link href="/" className="text-xs text-muted hover:text-accent">
              ← На главную
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
