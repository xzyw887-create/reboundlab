# ADMIN PANEL — ReboundLab

URL: `admin.reboundlab.io` (отдельное Next.js приложение)

## Роли

| Роль | Доступ |
|------|--------|
| superadmin | Всё |
| support | Users, subscriptions (read + limited write) |
| ops | Market data, system health, logs |

## Разделы

### Dashboard
- DAU / MAU
- MRR (monthly recurring revenue)
- Active subscriptions by tier
- Failed payments (last 24h)
- Market data sync status

### Users
- Search by email
- View profile, subscription, backtest history
- Ban / unban
- Reset trial
- Impersonate (read-only, audit logged)

### Subscriptions
- Change plan manually
- Extend subscription
- Grant free month (referral reward)

### Payments
- Transaction list
- Webhook log
- Refund (through ЮKassa dashboard link)

### Market Data
- Sync status per exchange
- Pairs count, candles count
- Gap report
- Force backfill button
- Pause/resume sync

### Backtests
- Queue depth
- Failed jobs
- Average compute time
- Kill stuck job

### Referrals
- Top referrers
- Fraud flags (same IP, etc.)

### System
- Server metrics (CPU, RAM, disk)
- Deploy history
- Feature flags toggle

### Content
- Edit legal pages (оферта, privacy)
- Edit pricing FAQ

### Logs
- Admin audit trail
- Error search (Sentry link)
- Sync error log

## Безопасность

- Separate JWT issuer
- IP allowlist (optional)
- 2FA required
- All mutations → `admin_audit_log`
