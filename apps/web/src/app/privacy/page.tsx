import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — BackTest Pro",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Политика конфиденциальности" subtitle="Черновик для beta · уточните с юристом перед масштабом">
      <p>
        Мы обрабатываем email и хеш пароля для входа, данные подписки (тариф, срок) и технические логи
        (IP, браузер) для безопасности сервиса.
      </p>
      <h2 className="text-lg font-semibold text-white pt-4">Что собираем</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Email и пароль (пароль хранится в виде хеша)</li>
        <li>История подписки и использования тарифа</li>
        <li>Параметры бэктестов — только в рамках вашей сессии / сохранённых настроек браузера</li>
      </ul>
      <h2 className="text-lg font-semibold text-white pt-4">Зачем</h2>
      <p>Авторизация, выдача доступа по тарифу, поддержка и улучшение продукта.</p>
      <h2 className="text-lg font-semibold text-white pt-4">Передача третьим лицам</h2>
      <p>
        Хостинг (Vercel/Render), база данных (PostgreSQL), платёжный провайдер (ЮKassa — когда
        подключим). Данные карты не храним на своих серверах.
      </p>
      <h2 className="text-lg font-semibold text-white pt-4">Ваши права</h2>
      <p>Запросить удаление аккаунта и данные — через support email.</p>
      <p className="text-xs text-muted pt-6">Обновлено: июль 2026</p>
    </LegalPageShell>
  );
}
