import type { Metadata } from "next";
import Link from "next/link";
import { PricingWithCheckout } from "@/components/PricingWithCheckout";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Тарифы — BackTest Pro",
  description:
    "3 дня бесплатно. Basic и Pro — бэктест на Binance Futures. Automatic скоро.",
};

const FAQ = [
  {
    q: "Сколько длится пробный период?",
    a: "3 дня бесплатного доступа без привязки карты. После — выберите Basic или Pro.",
  },
  {
    q: "Чем Basic отличается от Pro?",
    a: "Basic — одна монета и простые параметры. Pro — до 10 монет, усреднения, трейлинг и разный % для мемов.",
  },
  {
    q: "Как работает оплата сейчас?",
    a: "Этап 1 — заглушка: форма карты без реального списания. Тариф активируется сразу в аккаунте. Этап 2 — ЮKassa или Stripe.",
  },
  {
    q: "Automatic уже доступен?",
    a: "Нет. Тариф в разработке — на карточке отмечен «Скоро».",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="minimal" />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-14 w-full">
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <p className="label-caps text-accent">Подписки</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Personal licenses
          </h1>
          <p className="text-muted text-base sm:text-lg">
            <span className="text-gray-200">3 дня бесплатно</span> — затем Basic или Pro.
            Оплата → активация в аккаунте, как Tiger.com.
          </p>
          <Link href="/app" className="text-sm text-accent hover:text-accent/80">
            ← К калькулятору
          </Link>
        </section>

        <PricingWithCheckout />

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white text-center">Вопросы</h2>
          <div className="grid gap-3 max-w-2xl mx-auto">
            {FAQ.map((item) => (
              <details key={item.q} className="card-pro px-4 py-3 group">
                <summary className="cursor-pointer text-sm font-medium text-gray-200 list-none flex justify-between gap-2">
                  {item.q}
                  <span className="text-muted group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted mt-3 pb-1">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
