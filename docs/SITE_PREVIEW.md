# Как открыть сайт в браузере

## Локально (сейчас)

1. Postgres: `npm run docker:up` (из корня проекта)
2. Сайт: `npm run web:dev`
3. Открыть:
   - **Главная (лендинг):** http://localhost:3000
   - **Калькулятор:** http://localhost:3000/app
   - **Тарифы:** http://localhost:3000/pricing
   - **Аккаунт:** http://localhost:3000/account

## Публичная ссылка без домена (5 минут)

Если нужно показать кому-то с телефона:

```bash
# терминал 1
npm run web:dev

# терминал 2 (если установлен cloudflared)
cloudflared tunnel --url http://localhost:3000
```

Или с ngrok: `npx ngrok http 3000`

Вы получите временный URL вида `https://xxxx.trycloudflare.com`.

## Свой домен (этап 2)

1. Купить домен (Cloudflare, Namecheap) — например `backtestpro.ru` или `reboundlab.io`
2. Задеплоить Next.js на **Vercel** или **Railway**
3. В DNS: CNAME на хостинг
4. Env на сервере: `DATABASE_URL`, `JWT_SECRET`

## Этап 1 — оплата

- Кнопки Basic/Pro → форма карты (заглушка)
- `POST /api/subscription/activate` → запись в `core.subscriptions`, статус `active`, +30 дней
- Реальная карта **не списывается**
