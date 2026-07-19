import Link from "next/link";
import { AppLink } from "@/components/AppLink";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="flex items-center gap-3">
          <div className="logo-box w-9 h-9 text-xs">BP</div>
          <div>
            <p className="text-sm font-semibold text-white">BackTest Pro</p>
            <p className="text-xs text-muted">ReboundLab · Binance USDT-M</p>
          </div>
        </div>

        <div className="site-footer-links">
          <AppLink href="/app">Калькулятор</AppLink>
          <Link href="/pricing">Тарифы</Link>
          <Link href="/how-it-works">Как работает</Link>
          <Link href="/help">Помощь</Link>
          <AppLink href="/register">Регистрация</AppLink>
          <AppLink href="/account">Аккаунт</AppLink>
        </div>

        <div className="site-footer-links text-xs">
          <Link href="/privacy">Конфиденциальность</Link>
          <Link href="/terms">Соглашение</Link>
          <a href="mailto:support@reboundlab.app">support@reboundlab.app</a>
        </div>

        <p className="text-xs text-muted max-w-xl">
          Результаты бэктеста — модель, не инвестиционная рекомендация. Комиссия taker 0.05%, funding
          Binance.
        </p>
      </div>
    </footer>
  );
}
