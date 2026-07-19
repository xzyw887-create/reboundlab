import Link from "next/link";
import { AppLink } from "@/components/AppLink";
import { PricingWithCheckout } from "@/components/PricingWithCheckout";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const FEATURES = [
  {
    title: "Реальные свечи Binance",
    text: "Минутные данные USDT-M, funding и комиссия taker 0.05% — как на бирже.",
    icon: "📈",
  },
  {
    title: "Кросс-маржа и multi",
    text: "До 10 монет на одном банке, усреднения, трейлинг — тариф Pro.",
    icon: "⚡",
  },
  {
    title: "Личные лицензии",
    text: "Регистрация → пробный период → оплата → тариф в аккаунте. Как Tiger.com.",
    icon: "🔐",
  },
];

const STEPS = [
  { n: "01", title: "Регистрация", text: "3 дня бесплатно, без карты" },
  { n: "02", title: "Бэктест", text: "Откройте калькулятор и прогоните стратегию" },
  { n: "03", title: "Подписка", text: "Basic или Pro — активация сразу после оплаты" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="landing-hero">
          <div className="landing-hero-glow" aria-hidden />
          <div className="landing-container landing-hero-grid">
            <div className="space-y-6">
              <p className="label-caps text-accent">ReboundLab · BackTest Pro</p>
              <h1 className="landing-title">
                Бэктест стратегий
                <span className="landing-title-accent"> на отскоках</span>
              </h1>
              <p className="landing-lead">
                Профессиональный калькулятор для Binance Futures: падение от пика, TP,
                усреднения, кросс-маржа. Интерфейс и тарифы — в духе Tiger, цвета из вашего
                референса.
              </p>
              <div className="flex flex-wrap gap-3">
                <AppLink href="/register" className="btn-primary px-6">
                  Начать — 3 дня бесплатно
                </AppLink>
                <AppLink href="/app" className="landing-btn-outline px-6">
                  Открыть калькулятор
                </AppLink>
              </div>
              <p className="text-xs text-muted">
                3 дня бесплатно · Без карты на пробном периоде
              </p>
            </div>

            <div className="landing-preview card-pro">
              <div className="card-pro-body space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-caps text-accent/80">Terminal preview</span>
                  <span className="pill-tag">Pro</span>
                </div>
                <div className="landing-chart-mock" aria-hidden />
                <div className="grid grid-cols-3 gap-2">
                  {["PnL +12.4%", "Сделок 47", "Max DD 8%"].map((s) => (
                    <div key={s} className="stat-card text-center py-3">
                      <p className="text-[11px] text-muted">Demo</p>
                      <p className="text-sm font-semibold text-white mt-1">{s}</p>
                    </div>
                  ))}
                </div>
                <AppLink href="/app" className="btn-primary w-full text-center block">
                  Запустить бэктест
                </AppLink>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <p className="label-caps text-accent">Возможности</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Всё для проверки стратегии</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <article key={f.title} className="card-pro">
                  <div className="card-pro-body space-y-3">
                    <span className="text-2xl" aria-hidden>
                      {f.icon}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{f.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--muted">
          <div className="landing-container">
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step) => (
                <div key={step.n} className="landing-step">
                  <span className="landing-step-num">{step.n}</span>
                  <h3 className="text-lg font-semibold text-white mt-3">{step.title}</h3>
                  <p className="text-sm text-muted mt-2">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section">
          <div className="landing-container space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <p className="label-caps text-accent">Personal licenses</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Тарифы и подписки</h2>
              <p className="text-muted">
                Как на Tiger: выберите план → оплата → лицензия сразу в{" "}
                <Link href="/account" className="text-accent hover:underline">
                  аккаунте
                </Link>
                .
              </p>
            </div>
            <PricingWithCheckout />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
