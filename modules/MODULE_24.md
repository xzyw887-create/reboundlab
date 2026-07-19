# MODULE_24 — Notifications

## Статус: ⏳ Pending

## Цель

Email: trial expiry, payment

## Папка

`/services/notifications`

## Зависимости

M05

## Ключевые файлы

- `services/notifications/src/email.service.ts`

## Таблицы БД

core.notification_queue

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Sent status

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

