import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Как это работает — BackTest Pro",
  description: "Регистрация, пробный период, бэктест и подписка Basic / Pro.",
};

const STEPS = [
  {
    n: "1",
    title: "Регистрация",
    text: "Создайте аккаунт — 3 дня пробного доступа без карты. Email и пароль, без лишних полей.",
  },
  {
    n: "2",
    title: "Откройте калькулятор",
    text: "Перейдите в терминал (/app): выберите монету, период, параметры стратегии и нажмите «Запустить бэктест».",
  },
  {
    n: "3",
    title: "Смотрите результат",
    text: "График, сделки, PnL, комиссии и funding — как на Binance USDT-M (taker 0.05%).",
  },
  {
    n: "4",
    title: "Выберите тариф",
    text: "Basic — одна монета. Pro — до 10 монет, усреднения, трейлинг. Automatic — скоро.",
  },
  {
    n: "5",
    title: "Подписка в аккаунте",
    text: "После оплаты тариф сразу активен в разделе «Мой тариф». Калькулятор открывает функции вашего плана.",
  },
];

export default function HowItWorksPage() {
  return (
    <LegalPageShell title="Как это работает" subtitle="Путь пользователя — как на Tiger.com Personal licenses">
      <p>
        BackTest Pro — веб-сервис: регистрация → пробный период → бэктест в браузере → подписка → доступ
        по тарифу. Скачиваемое приложение — позже; сейчас всё работает на сайте.
      </p>

      <div className="grid gap-4 not-prose mt-6">
        {STEPS.map((s) => (
          <div key={s.n} className="landing-step">
            <span className="landing-step-num">{s.n}</span>
            <h2 className="text-lg font-semibold text-white mt-2">{s.title}</h2>
            <p className="text-sm text-muted mt-1">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-8 not-prose">
        <Link href="/register" className="btn-primary px-5 py-2.5 text-sm">
          Начать — 3 дня бесплатно
        </Link>
        <Link href="/pricing" className="landing-btn-outline px-5 py-2.5 text-sm">
          Тарифы
        </Link>
        <Link href="/app" className="text-sm text-accent hover:underline py-2.5">
          Открыть калькулятор →
        </Link>
      </div>
    </LegalPageShell>
  );
}
