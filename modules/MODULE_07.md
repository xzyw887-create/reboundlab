# MODULE_07 — Payments

## Статус: ⏳ Pending

## Цель

ЮKassa checkout, webhooks

## Папка

`/services/payments`

## Зависимости

M06

## Ключевые файлы

- `services/payments/src/payments.controller.ts`
- `services/payments/src/yukassa.provider.ts`

## Таблицы БД

core.payments, core.invoices

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Payment status

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

