# ROADMAP — ReboundLab

## Фаза 0 — Проектирование ✅

- [x] Архитектура
- [x] Уточняющие вопросы и ответы
- [x] Фиксация решений (кросс-маржа, тики, USDT-пары)

## Фаза 1 — Foundation (недели 1–6) 🔄

- [x] M01: Monorepo, Docker, CI skeleton
- [x] M02: Database schemas (core, market, backtest, timescale)
- [x] M09: Exchange SDK (Binance USDT-M Futures)
- [x] M10: Symbol catalog sync
- [x] M11: Historical loader (1m, checkpointed)
- [x] M12: Live updater (60s)
- [ ] M03: API Gateway skeleton
- [ ] M04: Auth (email + password)
- [ ] M05: Users CRUD
- [ ] Staging deploy

**Milestone:** База свечей растёт автоматически, API отдаёт candles.

## Фаза 2 — Backtester Core (недели 7–14) 🔄

- [x] M14: Strategy parameters + presets
- [x] M15: Single-coin simulator (cross margin, fees, funding)
- [x] M17: Trailing TP + averaging grid ×3
- [ ] M13: Backtester orchestration (API + DB)
- [x] M16: Multi-coin portfolio (shared deposit)
- [ ] M19: Trades table + PnL curve API
- [ ] M20: Chart with entry/exit markers
- [x] M21: Web UI starter + multi-coin mode

**Milestone:** Starter tier работает end-to-end.

## Фаза 3 — Commerce & Web (недели 15–19)

- [ ] M06: Subscriptions + feature flags
- [ ] M07: ЮKassa integration
- [ ] M08: Referral program
- [ ] M22: Marketing site + legal pages
- [ ] M24: Email notifications
- [ ] M23: Admin panel v1

**Milestone:** Регистрация, оплата, trial 10 прогонов.

## Фаза 4 — Pro Tier (недели 20–24)

- [ ] Multi-coin UI (до 10 монет)
- [ ] TradingView Lightweight Charts
- [ ] Basic indexes (BTC.D, TOTAL, ETH/BTC)
- [ ] Monthly PnL breakdown
- [ ] Trade drill-down

**Milestone:** Pro tier live.

## Фаза 5 — Automatic Tier (недели 25–32)

- [ ] M18: Grid search optimizer
- [ ] Auto-exclude liquidated coins
- [ ] Multi-coin portfolio optimization
- [ ] Per-coin results tabs
- [ ] Yearly/monthly PnL rollup

**Milestone:** Automatic tier live.

## Фаза 6 — Polish (недели 33–36)

- [ ] M26: Backup automation
- [ ] M25: Monitoring dashboards
- [ ] M28: Agents office (Cursor workspace)
- [ ] Security audit

## Фаза 7 — Global Scale (ongoing)

- [ ] Stripe + Apple Pay
- [ ] Bybit, OKX, Bitget connectors
- [ ] Kubernetes migration
- [ ] Mobile app

---

**Текущий фокус:** M01 → M02 → M09 (Market Data)
