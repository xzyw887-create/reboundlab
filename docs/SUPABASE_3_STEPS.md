# 3 шага — Supabase + Vercel (без терминала)

Вы уже создали **Supabase Backtestpro** и **Vercel backtestpro**. Осталось 3 действия.

---

## Шаг 1 — Таблицы в Supabase (2 мин)

1. Supabase → слева **SQL Editor**
2. **New query**
3. Откройте файл `docs/supabase-auth-only.sql` в Cursor — скопируйте **весь** текст
4. Вставьте в Supabase → **Run** (или Ctrl+Enter)
5. Должно быть **Success**

*(Таблицы users, plans, subscriptions — для регистрации)*

---

## Шаг 2 — Строка подключения (1 мин)

1. Supabase → сверху зелёная кнопка **Connect**
2. **App Frameworks** → **Next.js**
3. Скопируйте **DATABASE_URL** (или URI)
   - Mode: **Transaction** (pooler, порт **6543**)
   - Нажмите **Reveal** чтобы увидеть пароль

Строка вида:
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres
```

---

## Шаг 3 — Vercel (2 мин)

1. Откройте: https://vercel.com/backtestpro/reboundlab/settings/environment-variables
2. **Add New**:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | строка из шага 2 |
| `JWT_SECRET` | `11d02cbf9052c7c782e8dc0e0499b520584ff0e9a7b2a222416037442d6bd900` |

3. Environment: **Production** → Save
4. **Deployments** → последний → **⋯** → **Redeploy**

---

## Готово

https://reboundlab-tau.vercel.app/register — регистрация должна работать.

---

## Могу ли я «сам зайти»?

**Нет** — у меня нет доступа к вашим паролям Supabase/Vercel (это правильно с точки зрения безопасности).

**Да, могу доделать за вас**, если пришлёте **только строку DATABASE_URL** из шага 2 — я из терминала:
- проверю таблицы
- добавлю переменные в Vercel
- сделаю redeploy

Пароль в чате можно заменить на `***` если уже вставили в Vercel сами.
