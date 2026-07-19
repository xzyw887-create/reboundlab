# Демо в облаке — 3 монеты + калькулятор с Python

**Render не открывается?** Используйте **Railway** (ниже) — тот же Docker, без GitHub.

## Шаг 1 — Свечи в Supabase

```bash
cd ~/Projects/reboundlab
DATABASE_URL='postgresql://...@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
  bash scripts/demo-cloud-setup.sh
```

*(Порт **5432**, не 6543.)*

## Шаг 2 — Railway (сайт + Python + бэктест)

```bash
npm install -g @railway/cli
railway login
cd ~/Projects/reboundlab
railway init
railway variables --set "DATABASE_URL=..." --set "JWT_SECRET=..." --set "PROJECT_ROOT=/app"
bash scripts/deploy-railway.sh
```

Получите URL вида `https://reboundlab-production.up.railway.app`

Проверка: `/app` → BTC, ETH, SOL → **бэктест считается**.

## Шаг 3 — Vercel (опционально)

Кнопки лендинга → Railway:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_FULL_APP_URL` | URL Railway |

---

## Альтернатива: Render

Если render.com откроется — `render.yaml` + GitHub (см. комментарии в файле).
