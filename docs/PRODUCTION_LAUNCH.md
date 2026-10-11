# Production launch — домен + деплой BackTest Pro

Цель: люди заходят на **ваш домен**, регистрируются, гоняют бэктест (Python + Next.js в одном контейнере).

## Рекомендуемый стек (MVP)

| Часть | Сервис | Почему |
|-------|--------|--------|
| Приложение | **Railway** или **Render** | Docker: Next.js + Python-бэктест |
| База | **Neon** | PostgreSQL, бесплатный tier, pooled URL |
| Домен | **Cloudflare** | DNS + SSL бесплатно |
| Email (позже) | Resend / SMTP | Сброс пароля, чеки |

> **Не Vercel** для основного приложения — там нет Python-бэктеста. Vercel подходит только для статического лендинга без `/app`.

---

## Шаг 0 — Домен

1. Купите домен (например `backtestpro.app`, `.io`, `.com`) — Cloudflare Registrar или Namecheap.
2. Перенесите DNS в **Cloudflare** (Nameservers у регистратора).
3. Пока деплой не готов — можно ничего не настраивать; CNAME добавим на шаге 4.

---

## Шаг 1 — База Neon (10 мин)

1. [neon.tech](https://neon.tech) → **New project** → регион **EU (Frankfurt)** или **Singapore**.
2. Скопируйте **Pooled connection** (`...-pooler....neon.tech/neondb?sslmode=require`).
3. На Mac примените схемы:

```bash
cd ~/Projects/reboundlab
DATABASE_URL='postgresql://...pooler.../neondb?sslmode=require' npm run db:migrate:neon
```

Должно быть: `Done. Auth tables ready.`

4. (Опционально) 3 демо-монеты для облака:

```bash
DATABASE_URL='...' bash scripts/demo-cloud-setup.sh 30
```

---

## Шаг 2 — Секреты

```bash
openssl rand -hex 32
```

Сохраните вывод как `JWT_SECRET` (32+ символов).

| Переменная | Пример |
|------------|--------|
| `DATABASE_URL` | Neon pooled URL |
| `JWT_SECRET` | вывод openssl |
| `NODE_ENV` | `production` |
| `PROJECT_ROOT` | `/app` |
| `NEXT_PUBLIC_APP_URL` | `https://ваш-домен.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@ваш-домен.com` |
| `NEXT_PUBLIC_TELEGRAM_URL` | `https://t.me/...` (опционально) |

Шаблон: `scripts/production.env.example`

---

## Шаг 3 — Деплой приложения

### Вариант A — Railway (рекомендуем)

```bash
npm install -g @railway/cli
railway login
cd ~/Projects/reboundlab
railway init          # New project → имя backtest-pro
railway variables set DATABASE_URL='...'
railway variables set JWT_SECRET='...'
railway variables set PROJECT_ROOT='/app'
railway variables set NODE_ENV='production'
railway variables set NEXT_PUBLIC_APP_URL='https://ваш-домен.com'
bash scripts/deploy-railway.sh
```

URL: `railway open` или Dashboard → **Settings → Domains** (временный `*.up.railway.app`).

### Вариант B — Render

1. Репозиторий на **GitHub** (push проекта).
2. [render.com](https://render.com) → **New → Blueprint** → `render.yaml`.
3. В Dashboard задайте `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
4. Deploy.

Free tier «засыпает» ~15 мин без трафика (первый запрос медленный).

### Вариант C — Fly.io

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly secrets set DATABASE_URL='...' JWT_SECRET='...' PROJECT_ROOT='/app' NODE_ENV='production'
bash scripts/deploy-fly.sh
```

---

## Шаг 4 — Подключить свой домен

### Railway

1. Dashboard → Service → **Settings → Networking → Custom Domain**.
2. Добавьте `ваш-домен.com` и `www`.
3. В **Cloudflare DNS**:
   - `CNAME` `@` или `www` → значение из Railway (или CNAME flattening для apex).
4. Обновите `NEXT_PUBLIC_APP_URL=https://ваш-домен.com` → redeploy.

### Render

Settings → Custom Domains → CNAME на `*.onrender.com`.

### Cloudflare SSL

- SSL/TLS → **Full (strict)**.
- Включите **Always Use HTTPS**.

---

## Шаг 5 — Проверка после деплоя

```bash
curl -sS https://ваш-домен.com/api/health
# {"ok":true,...}

# В браузере:
# /           — лендинг
# /register   — регистрация
# /app        — терминал + бэктест
# /account    — trial / тариф
```

---

## Чеклист перед публичным анонсом

- [ ] `JWT_SECRET` не `change-me` и не из dev
- [ ] `NEXT_PUBLIC_APP_URL` = реальный HTTPS-домен
- [ ] `/api/subscription/activate` — только после ЮKassa (сейчас заглушка!)
- [ ] Оферта `/terms`, политика `/privacy` — актуальный текст
- [ ] Email для сброса пароля (сейчас ссылка в лог сервера)
- [ ] Бэкап Neon (встроенный в paid; на free — экспорт по расписанию)

---

## Быстрый старт одной командой (после Neon + Railway login)

```bash
bash scripts/deploy-production.sh
```

Скрипт проверит CLI, напомнит переменные и запустит деплой.

---

## Связанные файлы

- `deploy/docker/Dockerfile.web` — production-образ
- `railway.toml` / `render.yaml` / `fly.toml`
- `docs/NEON_SETUP.md` — детали Neon
- `docs/SECURITY.md` — секреты и HTTPS
