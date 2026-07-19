# MODULE_23 — Admin Panel

## Статус: ⏳ Pending

## Цель

Users, sync, system health

## Папка

`/apps/admin`

## Зависимости

M05,M12

## Ключевые файлы

- `apps/admin/src/app/`

## Таблицы БД

core.*, market.sync_logs

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Admin dashboards

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

