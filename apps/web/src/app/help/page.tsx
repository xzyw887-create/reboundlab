import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Помощь — BackTest Pro",
  description: "FAQ: тарифы, данные Binance, комиссии, пробный период.",
};

const FAQ = [
  {
    q: "Что такое BackTest Pro?",
    a: "Калькулятор для проверки стратегий «покупка на падении» на истории Binance Futures USDT-M с комиссией и funding.",
  },
  {
    q: "Сколько длится пробный период?",
    a: "3 дня с момента регистрации. Без карты. После — Basic или Pro.",
  },
  {
    q: "Откуда берутся цены?",
    a: "Минутные свечи Binance Futures загружаются в нашу базу. Период зависит от тарифа и доступности монеты.",
  },
  {
    q: "Как считается комиссия?",
    a: "Taker 0.05% на каждое открытие, усреднение и закрытие — как стандарт Binance USDT-M.",
  },
  {
    q: "Чем Basic отличается от Pro?",
    a: "Basic — 1 монета, простые параметры. Pro — до 10 монет, усреднения, трейлинг, разный % для мемов.",
  },
  {
    q: "Automatic доступен?",
    a: "Нет, в разработке. На карточке тарифа отмечено «Скоро».",
  },
  {
    q: "Нужно ли скачивать программу?",
    a: "Нет. Калькулятор работает в браузере. Приложение для Windows/телефона — в планах позже.",
  },
];

export default function HelpPage() {
  return (
    <LegalPageShell title="Помощь и FAQ">
      <p>
        Не нашли ответ? Напишите на{" "}
        <a href="mailto:support@reboundlab.app" className="text-accent hover:underline">
          support@reboundlab.app
        </a>{" "}
        (замените на ваш email при запуске).
      </p>

      <div className="grid gap-3 mt-6 not-prose">
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

      <p className="mt-8 not-prose">
        <Link href="/how-it-works" className="text-accent hover:underline">
          Как это работает →
        </Link>
      </p>
    </LegalPageShell>
  );
}
