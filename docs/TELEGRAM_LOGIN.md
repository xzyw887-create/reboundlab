# Вход через Telegram (Login Widget)

## Быстрый чеклист (локально / прод)

1. BotFather → `/newbot` или существующий бот → скопировать **token**.
2. В `apps/web/.env` или корневой `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:AAH...
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotNameBot
   ```
3. BotFather → `/setdomain` → бот → `backtestpro.ru` (на проде). Для localhost иногда нужен tunnel с HTTPS.
4. Перезапуск: `cd apps/web && npm run dev`.
5. Открыть **http://localhost:3000/register** — должна быть кнопка Telegram.

На сайте: в шапке **Вход** / **Регистрация**; Telegram только на этих страницах.

## 1. BotFather

1. Создайте бота или возьмите существующего → скопируйте **token** → `TELEGRAM_BOT_TOKEN`.
2. Username бота (без `@`) → `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.
3. Привяжите домен сайта к боту (иначе кнопка не работает на проде):
   - `/setdomain` → выберите бота → укажите `backtestpro.ru` (и при необходимости `localhost` для тестов — см. доку Telegram).

## 2. Переменные окружения

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=BackTestProBot
```

Перезапустите web после изменения env.

## 3. Поведение

- Первый вход через Telegram → регистрация + **1 день trial** (как email).
- Повторный вход с тем же `telegram_id` → тот же аккаунт (второй trial невозможен).
- Email-only аккаунты без пароля для TG не создаются; у TG-пользователя пароль `NULL`, вход только через кнопку.
- Проверка подписи — [Checking authorization](https://core.telegram.org/widgets/login#checking-authorization).

## 4. Локальная разработка

На `localhost` виджет иногда требует отдельной настройки домена у Telegram. Если кнопка не появляется — проверьте `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` и консоль браузера.
