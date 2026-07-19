# MODULE_09 — Exchange Connectors

## Статус: ✅ Done

## Цель

IExchangeConnector, Binance, Bybit adapters

## Папка

`/packages/exchange-sdk`

## Зависимости

M01

## Ключевые файлы

- `packages/exchange-sdk/src/interfaces/exchange-connector.ts`
- `packages/exchange-sdk/src/binance/binance.connector.ts`

## Таблицы БД

market.exchanges

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

Normalized klines, symbols

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

