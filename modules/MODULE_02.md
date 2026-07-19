# MODULE_02 — Database Core

## Статус: ✅ Done

## Цель

Migrations, schemas, seeds

## Папка

`/database`

## Зависимости

M01

## Ключевые файлы

- `database/schemas/01_core.sql`
- `database/schemas/02_market.sql`
- `database/schemas/03_backtest.sql`
- `database/timescale/hypertables.sql`

## Таблицы БД

core.*, market.*, backtest.*

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Migration runner

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

