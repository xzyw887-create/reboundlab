# MODULE_13 — Backtester Core

## Статус: ⏳ Pending

## Цель

Run orchestration, job queue

## Папка

`/services/backtester, /backtester`

## Зависимости

M12

## Ключевые файлы

- `services/backtester/src/backtest.controller.ts`
- `backtester/core/engine.py`

## Таблицы БД

backtest.backtest_runs

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Run ID + status

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

