# MODULE_26 — Backup & Recovery

## Статус: ⏳ Pending

## Цель

pg_dump, verify, restore

## Папка

`/scripts/backup`

## Зависимости

M02

## Ключевые файлы

- `scripts/backup/pg_dump_daily.sh`
- `scripts/backup/restore.sh`

## Таблицы БД

—

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Backup archives

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

