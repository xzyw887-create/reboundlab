# Подключение Neon к BackTest Pro (Vercel)

## Шаг 1 — Создать базу Neon (5 мин)

1. Откройте **https://neon.tech** → Sign up (Google/GitHub)
2. **New Project** → имя: `reboundlab` → регион ближе к вам (Singapore / US East)
3. На Dashboard скопируйте **Connection string**:
   - вкладка **Connection details**
   - режим **Pooled connection** (важно для Vercel!)
   - строка вида:
     ```
     postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
     ```

## Шаг 2 — Применить схему (таблицы users, plans…)

На Mac в терминале:

```bash
cd ~/Projects/reboundlab
DATABASE_URL='ВСТАВЬТЕ_СТРОКУ_ИЗ_NEON' node scripts/migrate/apply-neon.js
```

Должно быть: `Done. Auth tables ready.`

## Шаг 3 — Переменные в Vercel

1. **https://vercel.com/backtestpro/reboundlab/settings/environment-variables**
2. Добавить:

| Name | Value |
|------|--------|
| `DATABASE_URL` | та же pooled-строка из Neon |
| `JWT_SECRET` | случайная строка 32+ символов |

Сгенерировать JWT_SECRET:
```bash
openssl rand -hex 32
```

3. Environment: **Production** (и Preview — по желанию)
4. **Save**

## Шаг 4 — Redeploy

Vercel → **Deployments** → последний деплой → **⋯** → **Redeploy**

Или из терминала:
```bash
cd ~/Projects/reboundlab && npx vercel deploy --prod --yes
```

## Шаг 5 — Проверка

1. https://reboundlab-tau.vercel.app/register — регистрация
2. https://reboundlab-tau.vercel.app/account — тариф Trial 3 дня

---

## Альтернатива: Neon прямо из Vercel

1. Vercel → Project **reboundlab** → **Storage** → **Connect Database** → **Neon**
2. Создать БД — `DATABASE_URL` подставится сам
3. Локально всё равно запустить `apply-neon.js` с этой строкой

---

## Важно

- **Pooled** URL для Vercel (serverless)
- **Unpooled** — только для длинных миграций/backfill с вашего Mac
- Бэктест на Vercel (Python) пока не работает — только auth и сайт
- Свечи в Neon пустые до backfill — калькулятор на Vercel всё равно без Python
