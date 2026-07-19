# MODULE_12 — Live Updater

## Статус: ✅ Done

## Цель

Incremental sync every 60s

## Папка

`/services/market-data`

## Зависимости

M11

## Ключевые файлы

- `services/market-data/sync/schedulers/live_sync.py`

## Таблицы БД

market.sync_state, market.candles

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

New candles inserted

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

