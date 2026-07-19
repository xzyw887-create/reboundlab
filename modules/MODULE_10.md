# MODULE_10 — Symbol Catalog

## Статус: ✅ Done

## Цель

USDT pairs list, history filter ≥365d

## Папка

`/services/market-data`

## Зависимости

M09

## Ключевые файлы

- `services/market-data/sync/catalog.py`

## Таблицы БД

market.trading_pairs

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Active symbols list

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

