# BACKUP — ReboundLab

## Объекты резервного копирования

| Объект | Метод | Частота | Retention |
|--------|-------|---------|-----------|
| PostgreSQL (core) | pg_dump + WAL | Daily + continuous | 30 daily, 12 monthly |
| TimescaleDB (candles) | pg_dump partitioned | Weekly full | 4 weekly |
| Redis | RDB snapshot | Daily | 7 days |
| Code | GitHub | Every push | ∞ |
| Secrets | Infisical | On change | Encrypted |
| Docs | Git + S3 mirror | Weekly | 12 months |

## RTO / RPO

- **RTO** (время восстановления): 4 часа
- **RPO** (потеря данных): 1 час (WAL streaming)

## Скрипты

```
scripts/backup/
├── pg_dump_daily.sh
├── verify_backup.sh
└── restore.sh
```

## Процедура восстановления

1. Поднять чистый PostgreSQL из Terraform
2. `scripts/backup/restore.sh --date YYYY-MM-DD`
3. Проверить `sync_state` — gap backfill если нужно
4. Smoke test API

## Мониторинг бэкапов

- CI job `backup-verify.yml` — еженедельная проверка restore
- Alert в Telegram при failed backup

## Candles recovery

Свечи можно перезагрузить с бирж (идемпотентно).
Core data (users, payments) — только из backup.
