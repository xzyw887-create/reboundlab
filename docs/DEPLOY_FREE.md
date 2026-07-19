# Деплой на бесплатный домен

## Вариант A — Vercel (быстро, `*.vercel.app`)

**Плюсы:** бесплатный домен за 2 минуты, CDN.  
**Минус:** калькулятор (Python-бэктест) на Vercel **не работает** — только сайт, регистрация, тарифы. Бэктест нужен Render.

```bash
cd ~/Projects/reboundlab
npx vercel login
npx vercel --cwd apps/web
# В Vercel Dashboard → Settings → Root Directory: apps/web
# Environment: DATABASE_URL, JWT_SECRET (мин. 32 символа)
```

После деплоя: `https://ваш-проект.vercel.app`

### Бесплатная БД (Neon)

1. [neon.tech](https://neon.tech) → Create project → скопировать `DATABASE_URL`
2. Локально применить схему:
   ```bash
   DATABASE_URL='postgresql://...' npm run db:migrate
   ```
3. Вставить `DATABASE_URL` в Vercel → Environment Variables → Redeploy

---

## Вариант B — Render (полный сайт + калькулятор, `*.onrender.com`)

**Плюсы:** Node + Python в одном контейнере — **бэктест работает**.  
**Минус:** free tier «засыпает» после 15 мин без посещений (первый запрос ~30 сек).

1. Репозиторий на GitHub
2. [render.com](https://render.com) → New → Blueprint → `render.yaml`
3. `DATABASE_URL` из Neon (как выше)
4. Deploy

---

## Переменные окружения

| Variable | Пример |
|----------|--------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | случайная строка 32+ символов |
| `PROJECT_ROOT` | `/app` (только Render Docker) |

---

## Проверка после деплоя

- `/` — лендинг
- `/register` — регистрация
- `/app` — калькулятор (Render)
- `/pricing` — тарифы
- `/account` — подписка
