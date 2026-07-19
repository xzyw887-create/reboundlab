# MODULE_19 — Results & Analytics

## Статус: ⏳ Pending

## Цель

PnL curves, monthly rollup

## Папка

`/services/backtester`

## Зависимости

M15

## Ключевые файлы

- `services/backtester/src/results.service.ts`

## Таблицы БД

backtest.pnl_snapshots, backtest.trades

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Analytics DTOs

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

