# ARCHITECTURE — ReboundLab

## Обзор системы

```mermaid
graph TB
    User[Пользователь] --> CDN[Cloudflare CDN]
    CDN --> Web[apps/web]
    CDN --> Admin[apps/admin]

    Web --> GW[api-gateway :3000]
    Admin --> GW

    GW --> Auth[auth :3001]
    GW --> Users[users :3002]
    GW --> Subs[subscriptions :3003]
    GW --> Pay[payments :3004]
    GW --> BT[backtester-api :3020]
    GW --> MD[market-data-api :3010]

    BT --> Worker[worker]
    Worker --> PyEngine[backtester Python]
    Worker --> Optimizer[optimizer Python]

    MD --> MDSync[market-data-sync]
    MDSync --> Binance[Binance API]
    MDSync --> Bybit[Bybit API]

    Auth --> PG[(PostgreSQL)]
    Users --> PG
    Subs --> PG
    BT --> PG
    MDSync --> TS[(TimescaleDB candles)]
    Worker --> Redis[(Redis)]
```

## Сервисы

| Сервис | Язык | Назначение |
|--------|------|------------|
| api-gateway | TypeScript/NestJS | Единая точка входа, rate limit |
| auth | TypeScript | JWT, регистрация, логин |
| users | TypeScript | Профили, настройки |
| subscriptions | TypeScript | Планы, trial, feature gates |
| payments | TypeScript | ЮKassa webhooks |
| referrals | TypeScript | Реферальные коды |
| market-data-api | TypeScript | Read-only: symbols, candles |
| market-data-sync | Python | Загрузка и sync с бирж |
| backtester-api | TypeScript | Запуск/статус backtest runs |
| backtester-engine | Python | CPU-intensive расчёты |
| optimizer | Python | Automatic mode |
| worker | TypeScript | BullMQ job processor |
| notifications | TypeScript | Email |

## Поток бэктеста

```mermaid
sequenceDiagram
    participant UI as Web App
    participant API as backtester-api
    participant Q as Redis Queue
    participant W as worker
    participant E as Python Engine
    participant DB as PostgreSQL

    UI->>API: POST /backtest/runs
    API->>DB: INSERT backtest_run (pending)
    API->>Q: enqueue job
    API-->>UI: run_id + status pending

    Q->>W: process job
    W->>E: run simulation
    E->>DB: SELECT candles (1m ticks)
    E->>E: simulate cross-margin trades
    E-->>W: results
    W->>DB: INSERT trades, pnl_snapshots
    W->>DB: UPDATE run status=completed

    UI->>API: GET /backtest/runs/:id
    API-->>UI: trades table + PnL
```

## Кросс-маржа (multi-coin)

- Один общий `bank_balance` на все открытые позиции
- Каждая позиция: `entry_pct_of_current_bank`
- Ликвидация любой позиции при кросс-марже → `bank_balance = 0`
- Все сделки останавливаются
- Записывается: `liquidated_symbol`, `liquidated_at`
- UI: кнопка «Исключить монету и пересчитать»

## Automatic optimizer

1. Grid search параметров (entry%, leverage, avg×3, Y/Z/N)
2. Прогон на выбранных USDT-парах
3. Если ликвидация → исключить монету → повторить
4. Вернуть лучший набор + сравнение «до/после исключения»

## Масштабирование

| Фаза | Users | Инфра |
|------|-------|-------|
| MVP | 0–1K | 1 VPS, Docker Compose |
| Growth | 1K–10K | 2× API, managed DB |
| Scale | 10K–100K | Kubernetes, dedicated MD node |

## 2D-офис (только Cursor)

Не входит в production stack для пользователей.
Метафора для владельца: переключение между агентами (код, оплаты, реклама, сайт).
