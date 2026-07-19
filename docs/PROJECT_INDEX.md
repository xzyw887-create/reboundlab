# PROJECT INDEX — ReboundLab

> Обновляется после каждой завершённой задачи.
> Перед работой читайте ТОЛЬКО этот файл + нужный MODULE_XX.md.

## Статус проекта

| Параметр | Значение |
|----------|----------|
| Версия | 0.1.0 |
| Текущая фаза | 1 — Foundation |
| Текущий модуль | M21 UI / M18 Optimizer (следующий) |
| Последнее обновление | 2026-07-10 |

## Модули

| # | Модуль | Папка | Статус | Зависит от |
|---|--------|-------|--------|------------|
| 01 | Infrastructure & DevOps | `/deploy`, `/.github`, `/scripts` | ✅ Done | — |
| 02 | Database Core | `/database` | ✅ Done | M01 |
| 03 | API Gateway | `/services/api-gateway` | ⏳ Pending | M02 |
| 04 | Auth | `/services/auth` | ⏳ Pending | M03 |
| 05 | Users | `/services/users` | ⏳ Pending | M04 |
| 06 | Subscriptions | `/services/subscriptions` | ⏳ Pending | M05 |
| 07 | Payments | `/services/payments` | ⏳ Pending | M06 |
| 08 | Referrals | `/services/referrals` | ⏳ Pending | M06 |
| 09 | Exchange Connectors | `/packages/exchange-sdk` | ✅ Done | M01 |
| 10 | Symbol Catalog | `/services/market-data` | ✅ Done | M09 |
| 11 | Historical Loader | `/services/market-data` | ✅ Done | M10 |
| 12 | Live Updater | `/services/market-data` | ✅ Done | M11 |
| 13 | Backtester Core | `/services/backtester`, `/backtester` | ⏳ Pending | M12 |
| 14 | Strategy Parameters | `/backtester/core/params.py` | ✅ Done | M13 |
| 15 | Single-Coin Simulator | `/backtester/simulators` | ✅ Done | M14 |
| 16 | Multi-Coin Portfolio | `/backtester/simulators` | ✅ Done | M15 |
| 17 | Trailing & Averaging | `/backtester/strategies` | ✅ Done | M15 |
| 18 | Optimizer (Automatic) | `/services/optimizer` | ⏳ Pending | M16, M17 |
| 19 | Results & Analytics | `/services/backtester` | ⏳ Pending | M15 |
| 20 | Charting | `/apps/web` | ⏳ Pending | M19 |
| 21 | App Frontend | `/apps/web` | 🔄 In Progress | M20 |
| 22 | Marketing Website | `/apps/web` | ⏳ Pending | M06 |
| 23 | Admin Panel | `/apps/admin` | ⏳ Pending | M05, M12 |
| 24 | Notifications | `/services/notifications` | ⏳ Pending | M05 |
| 25 | Monitoring | `/deploy`, Sentry | ⏳ Pending | M01 |
| 26 | Backup & Recovery | `/scripts/backup` | ⏳ Pending | M02 |
| 27 | Job Queue | `/services/worker` | ⏳ Pending | M01 |
| 28 | Agents Office (Cursor) | `/apps/office` | ⏳ Pending | — |

## Ключевые файлы по модулям

### M01 — Infrastructure (текущий)
- `deploy/docker/docker-compose.dev.yml`
- `.github/workflows/ci.yml`
- `package.json`, `turbo.json`
- `.env.example`

### M02 — Database (следующий)
- `database/schemas/core.sql`
- `database/schemas/market_data.sql`
- `database/schemas/backtest.sql`
- `database/timescale/hypertables.sql`

### M09–M12 — Market Data (неделя 3–5)
- `packages/exchange-sdk/`
- `services/market-data/`

## Зависимости между блоками

```
M01 → M02 → M03 → M04 → M05 → M06 → M07
M01 → M09 → M10 → M11 → M12 → M13 → M15 → M21
M15 → M16 → M17 → M18
M06 → M22
```

## Документация

| Файл | Описание |
|------|----------|
| `docs/MASTER_PLAN.md` | Видение и стек |
| `docs/ARCHITECTURE.md` | Диаграммы и сервисы |
| `docs/DATABASE.md` | Схема БД |
| `docs/MARKET_DATA.md` | Загрузка данных |
| `docs/ROADMAP.md` | План разработки |
| `modules/MODULE_XX.md` | Детали модуля |

## История изменений

| Дата | Изменение |
|------|-----------|
| 2026-07-10 | M01 завершён: monorepo, Docker, CI, docs, 28 modules |
| 2026-07-11 | M16: multi-coin simulator + web UI multi mode |
