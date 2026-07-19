# Демо в облаке — 3 монеты + калькулятор на Render

Пока на Mac идёт полный backfill, публичное демо: **Supabase (мало данных) + Render (Python-бэктест)**.

## Шаг 1 — Свечи в Supabase (~5 мин)

Supabase → **Connect** → **Transaction pooler** → **Copy**.

В терминале на Mac:

```bash
cd ~/Projects/reboundlab
DATABASE_URL='postgresql://postgres.xwclvdckofcvnwkaqemq:ПАРОЛЬ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require' \
  bash scripts/demo-cloud-setup.sh
```

Загрузит **BTC, ETH, SOL × 30 дней** (минутные свечи, ~130k строк — влезает в free Supabase).

## Шаг 2 — Render (полный сайт + калькулятор)

1. Репозиторий на **GitHub** (New repo → push проект)
2. [render.com](https://render.com) → **New** → **Blueprint** → репозиторий → `render.yaml`
3. Environment variables в Render:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | та же строка Supabase pooler |
| `JWT_SECRET` | тот же, что в Vercel (`11d02cbf...` или свой) |

4. Deploy → URL вида `https://reboundlab-web.onrender.com`

Проверка: `/register` → `/app` → выбор BTC/ETH/SOL → бэктест.

## Шаг 3 — Vercel (лендинг → демо на Render)

Vercel → Environment Variables → добавить:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_FULL_APP_URL` | `https://reboundlab-web.onrender.com` |

Redeploy Vercel. Кнопки «Калькулятор» / «3 дня бесплатно» ведут на Render.

## Архитектура

```
Vercel (лендинг)  ──ссылки──►  Render (сайт + Python)
                                    │
                                    ▼
                              Supabase Postgres
                              (users + 3 монеты × 30d)
```

**Важно:** регистрация для демо — на **Render** (тот же JWT + БД). Vercel только маркетинг.

## Позже (платная версия)

Свой домен, Neon/Supabase Pro, полный backfill 1095d — отдельный этап.
