# MODULE_11 — Historical Loader

## Статус: ✅ Done

## Цель

Backfill 1m candles, chunked, checkpointed

## Папка

`/services/market-data`

## Зависимости

M10

## Ключевые файлы

- `services/market-data/sync/loaders/historical.py`

## Таблицы БД

market.candles, market.load_checkpoints

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Loaded candle count

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

