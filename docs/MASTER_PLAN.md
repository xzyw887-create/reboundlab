# MASTER PLAN — ReboundLab

## Видение

ReboundLab — SaaS-платформа для бэктестинга крипто-стратегий на отскоках после проливов.
Аналог Tiger.com в веб-версии с тремя тарифами и режимом Automatic.

## Целевая аудитория

Трейдеры, тестирующие стратегии входа по падению с усреднениями, трейлингом и кросс-маржой.

## Ключевые решения (зафиксированы)

| Решение | Значение |
|---------|----------|
| Маржа | Кросс-маржа (общий депозит) |
| Данные для входа | Минутные тики (1m) |
| Комиссии | Да, с первого дня |
| Funding rate | Да, с первого дня |
| Монеты | Все USDT-пары с историей ≥365 дней |
| Индексы | Базовые (BTC.D, TOTAL, ETH/BTC) |
| Ликвидация multi-coin | Весь банк = 0, стоп всех сделок |
| Automatic | Исключение «виновных» монет + подбор параметров |
| 2D-офис | Только для владельца в Cursor, не для пользователей |
| Юрлицо | ИП / самозанятый (РФ), global позже |

## Тарифы

| Tier | Ключевые функции |
|------|------------------|
| Trial | 10 прогонов, 1 монета, Starter-функции |
| Starter | 1 монета, простые параметры, таблица + PnL |
| Pro | До 10 монет, графики, трейлинг, усреднения ×3, индексы |
| Automatic | Pro + оптимизатор + multi-coin portfolio + monthly PnL |

## Технологический стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind, Lightweight Charts |
| API | NestJS (TypeScript) |
| Backtester Engine | Python 3.12, NumPy, Pandas |
| Market Data Sync | Python 3.12 |
| Database | PostgreSQL 16 + TimescaleDB |
| Cache / Queue | Redis 7, BullMQ |
| Infra | Docker → Hetzner → Kubernetes (phase 3) |
| Payments RF | ЮKassa |
| Payments Global | Stripe (phase 7) |

## Принципы архитектуры

1. Market Data Service полностью независим от бэктестера
2. Бэктестер никогда не обращается к API бирж
3. Каждый модуль — отдельная документация
4. Минимальный контекст при разработке (PROJECT_INDEX + один MODULE)
5. Один файл — одно изменение, где возможно

## Границы MVP (Фаза 1–3)

- Binance USDT perpetual pairs
- Single-coin backtest (Starter)
- Регистрация + trial + ЮKassa
- Marketing site с pricing table

## Вне MVP (Фазы 4–7)

- Pro tier (multi-coin, charts)
- Automatic optimizer
- Bybit + дополнительные биржи
- Mobile app
- Stripe global

## Документы проекта

См. `docs/PROJECT_INDEX.md` для полной карты.
