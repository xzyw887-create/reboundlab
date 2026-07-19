# DEPLOYMENT — ReboundLab

## Окружения

| Env | URL | Hosting |
|-----|-----|---------|
| dev | localhost | Local Docker |
| staging | staging.reboundlab.io | Hetzner CPX31 |
| production | reboundlab.io | Hetzner CPX41+ |

## MVP Stack (1 VPS)

```
Hetzner CPX41 (8 vCPU, 16 GB RAM)
├── Docker Compose
│   ├── nginx (reverse proxy)
│   ├── api-gateway
│   ├── auth, users, subscriptions
│   ├── market-data-api + sync
│   ├── backtester-api + worker
│   ├── web (Next.js)
│   └── admin (Next.js)
├── PostgreSQL + TimescaleDB (same VPS or managed)
└── Redis
```

## Регион

**EU (Germany — FSN1)** — стабильный доступ к Binance/Bybit API.

## CI/CD

```
git push → GitHub Actions (ci.yml)
  → lint + test
  → build Docker images
  → deploy to staging (auto)
  → deploy to production (manual approve)
```

## Переменные окружения

См. `.env.example`. Production secrets — Infisical.

## Мониторинг

- Uptime: UptimeRobot / Better Stack
- Errors: Sentry
- Metrics: Prometheus + Grafana (Phase 6)
- Logs: structured JSON → Loki

## SSL

Cloudflare → origin server (Full Strict)

## Масштабирование (Phase 3+)

- Kubernetes on Hetzner
- Separate nodes: API, Worker, Market Data
- Managed PostgreSQL (Timescale Cloud)
- Redis Cluster
