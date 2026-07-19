# MODULE_16 — Multi-Coin Portfolio

## Статус: ✅ Done

## Цель

Shared deposit, cross-margin liq

## Папка

`/backtester/simulators`

## Зависимости

M15

## Ключевые файлы

- `backtester/simulators/multi_coin.py`

## Таблицы БД

backtest.trades, backtest.pnl_snapshots

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Portfolio results

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

