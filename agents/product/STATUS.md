# Продукт — статус

**Обновлено:** 2026-07-18

## Шаг E — M06 подписка на сервере ✅

| Артефакт | Путь |
|----------|------|
| Tier resolve + feature checks | `apps/web/src/lib/subscriptionEnforcement.ts` |
| Полная валидация API | `validateBacktestRequest.ts` |
| Страница аккаунта | `/account` |
| UI блок expired trial | `page.tsx`, `StrategyForm.tsx` |

**Сервер проверяет:** trial expired, multi/trailing/averaging/split/automatic, лимит монет, даты.

**Гость без входа:** на API всегда лимиты Trial.

**Следующий шаг:** M07 — ЮKassa (оплата → смена `core.subscriptions`).

## Шаг D — загрузка данных (в фоне)

Backfill ~1095d: `logs/backfill-1095-all.log`

## Журнал

| Дата | Событие |
|------|---------|
| 2026-07-18 | M06: server-side tier enforcement, /account |
| 2026-07-18 | Шаг D: backfill, tier date limits |
| 2026-07-18 | M04: auth, trial 3 дня |
| 2026-07-18 | Шаг C: тарифы, /pricing |
