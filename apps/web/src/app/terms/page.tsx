import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Пользовательское соглашение — BackTest Pro",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Пользовательское соглашение" subtitle="Черновик оферты для beta">
      <p>
        BackTest Pro — информационный сервис для моделирования сделок на исторических данных. Это не
        инвестиционная рекомендация и не гарантия будущей прибыли.
      </p>
      <h2 className="text-lg font-semibold text-white pt-4">Подписка</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Пробный период — 3 дня с регистрации</li>
        <li>Basic / Pro — помесячная подписка, условия на странице тарифов</li>
        <li>Доступ к функциям определяется активным тарифом в аккаунте</li>
      </ul>
      <h2 className="text-lg font-semibold text-white pt-4">Ограничение ответственности</h2>
      <p>
        Результаты бэктеста — модель. Реальная торговля может отличаться (проскальзывание, ликвидность,
        изменение правил биржи). Вы несёте ответственность за решения на рынке.
      </p>
      <h2 className="text-lg font-semibold text-white pt-4">Использование сервиса</h2>
      <p>Запрещены злоупотребления API, попытки обхода лимитов тарифа и нарушение законодательства.</p>
      <p className="text-xs text-muted pt-6">Обновлено: июль 2026 · замените реквизиты ИП/ООО перед продажами</p>
    </LegalPageShell>
  );
}
