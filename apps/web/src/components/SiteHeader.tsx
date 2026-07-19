"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLink } from "@/components/AppLink";

interface AuthUser {
  email: string;
}

interface Props {
  variant?: "landing" | "minimal";
}

export function SiteHeader({ variant = "landing" }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand group">
          <div className="logo-box">BP</div>
          <div>
            <p className="title-gradient text-lg leading-tight">BackTest Pro</p>
            <p className="label-caps mt-0.5 hidden sm:block">Binance Futures · Backtest</p>
          </div>
        </Link>

        <nav className="site-nav">
          {variant === "landing" && (
            <>
              <Link href="/how-it-works" className="site-nav-link hidden md:inline">
                Как работает
              </Link>
              <a href="#features" className="site-nav-link hidden md:inline">
                Возможности
              </a>
              <a href="#pricing" className="site-nav-link hidden md:inline">
                Тарифы
              </a>
              <Link href="/help" className="site-nav-link hidden lg:inline">
                Помощь
              </Link>
              <AppLink href="/app" className="site-nav-link">
                Калькулятор
              </AppLink>
            </>
          )}
          {user ? (
            <>
              <Link href="/account" className="site-nav-link hidden sm:inline truncate max-w-[160px]">
                {user.email}
              </Link>
              <AppLink href="/app" className="btn-primary site-cta-sm">
                Открыть терминал
              </AppLink>
            </>
          ) : (
            <>
              <AppLink href="/login" className="site-nav-link">
                Вход
              </AppLink>
              <AppLink href="/register" className="btn-primary site-cta-sm">
                3 дня бесплатно
              </AppLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
