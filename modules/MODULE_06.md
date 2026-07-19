# MODULE_06 — Subscriptions

## Статус: ⏳ Pending

## Цель

Plans, trial, feature flags, quota

## Папка

`/services/subscriptions`

## Зависимости

M05

## Ключевые файлы

- `services/subscriptions/src/subscriptions.service.ts`

## Таблицы БД

core.plans, core.subscriptions

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Subscription + features

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

