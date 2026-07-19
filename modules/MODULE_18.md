# MODULE_18 — Optimizer (Automatic)

## Статус: ⏳ Pending

## Цель

Grid search, exclude liquidated coins

## Папка

`/services/optimizer`

## Зависимости

M16,M17

## Ключевые файлы

- `services/optimizer/optimizer.py`
- `backtester/optimizers/grid_search.py`

## Таблицы БД

backtest.optimization_runs

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Best params + comparison

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

