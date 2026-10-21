"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/clientFetch";
import { pathAfterLogin } from "@/lib/postLoginPath";
import { useLocale } from "@/lib/i18n";

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
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const stopPoll = useRef(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  useEffect(() => {
    return () => {
      stopPoll.current = true;
    };
  }, []);

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

  async function startAppLogin() {
    if (!botUsername) return;
    setLoading(true);
    setWaiting(false);
    onError(null);
    stopPoll.current = false;
    try {
      const res = await apiFetch("/api/auth/telegram/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.token !== "string") {
        throw new Error(data.error || t.auth.errorGeneric);
      }
      const httpsUrl =
        typeof data.httpsUrl === "string"
          ? data.httpsUrl
          : `https://t.me/${botUsername}?start=login_${data.token}`;
      setTgUrl(httpsUrl);
      setWaiting(true);
      setLoading(false);
      const token = data.token as string;
      const deadline = Date.now() + 5 * 60 * 1000;
      while (!stopPoll.current && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (stopPoll.current) return;
        const poll = await apiFetch("/api/auth/telegram/app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const status = await poll.json();
        if (!poll.ok) {
          throw new Error(status.error || t.auth.errorGeneric);
        }
        if (status.pending) continue;
        window.location.href = pathAfterLogin(status.user, next);
        return;
      }
      if (!stopPoll.current) {
        setWaiting(false);
        onError(t.auth.telegramTimeout);
      }
    } catch (e) {
      setWaiting(false);
      setLoading(false);
      onError(e instanceof Error ? e.message : t.auth.errorGeneric);
    }
  }

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
      <button
        type="button"
        className="btn-telegram-face"
        onClick={() => void startAppLogin()}
        disabled={loading || waiting}
      >
        <TelegramPlaneIcon />
        <span>{loading ? t.auth.telegramSigningIn : t.auth.telegramButton}</span>
      </button>
      {waiting && tgUrl && (
        <div className="space-y-2">
          <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="btn-telegram-face">
            <TelegramPlaneIcon />
            <span>{t.auth.telegramOpen}</span>
          </a>
          <p className="text-xs text-muted text-center leading-snug">{t.auth.telegramAppWaiting}</p>
        </div>
      )}
    </div>
  );
}
