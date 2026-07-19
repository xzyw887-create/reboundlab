# API — ReboundLab

Base URL: `https://api.reboundlab.io/v1`

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | email + password |
| POST | `/auth/login` | returns JWT + refresh |
| POST | `/auth/refresh` | new access token |
| POST | `/auth/logout` | invalidate refresh |

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | current user profile |
| PATCH | `/users/me` | update settings |

## Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plans` | list plans + features |
| GET | `/subscriptions/me` | current subscription |
| POST | `/subscriptions/upgrade` | change plan |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments/checkout` | create ЮKassa session |
| POST | `/payments/webhook` | provider callback |

## Market Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/symbols` | USDT pairs list |
| GET | `/market/candles` | historical candles |

## Backtest

| Method | Path | Description |
|--------|------|-------------|
| POST | `/backtest/runs` | start backtest |
| GET | `/backtest/runs/:id` | status + summary |
| GET | `/backtest/runs/:id/trades` | trades table |
| GET | `/backtest/runs/:id/pnl` | PnL curve data |
| POST | `/backtest/optimize` | Automatic mode |
| GET | `/backtest/optimize/:id` | optimization results |

## Referrals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/referrals/code` | user's referral link |
| GET | `/referrals/stats` | referrals count + rewards |

## Admin (separate auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | list users |
| PATCH | `/admin/users/:id` | ban, change plan |
| GET | `/admin/sync/status` | market data health |
| POST | `/admin/sync/backfill` | force backfill |

## WebSocket (Phase 4)

`wss://api.reboundlab.io/v1/ws`

Events: `backtest:progress`, `backtest:completed`

## Rate Limits

| Tier | Requests/min |
|------|-------------|
| Trial | 30 |
| Starter | 60 |
| Pro | 120 |
| Automatic | 200 |
