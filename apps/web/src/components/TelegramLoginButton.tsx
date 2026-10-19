"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/clientFetch";
import { pathAfterLogin } from "@/lib/postLoginPath";
import type { TelegramWidgetAuth } from "@/lib/telegramLogin";
import { useLocale } from "@/lib/i18n";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetAuth) => void;
  }
}

function TelegramPlaneIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.48-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.82.42z" />
    </svg>
  );
}

interface Props {
  next: string;
  onError: (message: string | null) => void;
}

const localDevBypass = process.env.NODE_ENV === "development";

export function TelegramLoginButton({ next, onError }: Props) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  async function signInAsLocalUser() {
    setLoading(true);
    onError(null);
    try {
      const res = await apiFetch("/api/auth/dev-local", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      window.location.href = pathAfterLogin(data.user, next);
    } catch (e) {
      onError(e instanceof Error ? e.message : t.auth.errorGeneric);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = async (user: TelegramWidgetAuth) => {
      setLoading(true);
      onError(null);
      try {
        const res = await apiFetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t.auth.errorGeneric);
        }
        window.location.href = pathAfterLogin(data.user, next);
      } catch (e) {
        onError(e instanceof Error ? e.message : t.auth.errorGeneric);
        setLoading(false);
      }
    };

    const el = containerRef.current;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    el.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      el.innerHTML = "";
    };
  }, [botUsername, next, onError, t.auth.errorGeneric]);

  if (localDevBypass) {
    return (
      <button
        type="button"
        className="telegram-widget-host w-full bg-transparent border-0 p-0 cursor-pointer disabled:opacity-60"
        onClick={signInAsLocalUser}
        disabled={loading}
      >
        <span className="btn-telegram-face">
          <TelegramPlaneIcon />
          <span>{loading ? t.auth.telegramSigningIn : t.auth.telegramButton}</span>
        </span>
      </button>
    );
  }

  if (!botUsername) {
    return (
      <p className="text-[11px] text-muted text-center">{t.auth.telegramNotConfigured}</p>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`telegram-widget-host ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="btn-telegram-face" aria-hidden>
          <TelegramPlaneIcon />
          <span>{t.auth.telegramButton}</span>
        </div>
        <div ref={containerRef} className="telegram-widget-overlay" aria-label={t.auth.telegramButton} />
      </div>
      {loading && (
        <p className="text-xs text-muted text-center">{t.auth.telegramSigningIn}</p>
      )}
    </div>
  );
}
