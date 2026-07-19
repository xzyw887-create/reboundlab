# SECURITY — ReboundLab

## Аутентификация

- Passwords: bcrypt (cost 12)
- JWT access: 15 min expiry
- JWT refresh: 7 days, httpOnly cookie
- Admin: mandatory 2FA (TOTP)

## Данные

- PostgreSQL: encrypted at rest (provider-level)
- Secrets: Infisical / Doppler, never in git
- PII: email only, no KYC on MVP

## Платежи

- PCI DSS: не храним карты — ЮKassa/Stripe hosted checkout
- Webhook signatures: verify HMAC

## API

- Rate limiting per user/tier
- CORS: whitelist domains only
- Input validation: Zod schemas
- SQL: parameterized queries only

## Инфраструктура

- HTTPS everywhere (Cloudflare)
- SSH: key-only, no password
- Firewall: only 80/443 public
- DB: private network only

## Дисклеймер (на сайте)

> Результаты бэктестинга основаны на исторических данных.
> Не являются финансовой рекомендацией.
> Прошлые результаты не гарантируют будущую прибыль.

## 152-ФЗ (РФ)

- Политика конфиденциальности
- Согласие на обработку ПДн при регистрации
- Хранение ПДн на серверах с учётом требований (EU hosting допустим при корректной политике)

## Аудит

- `admin_audit_log` — все действия админа
- Sentry — error tracking
- Structured logs — JSON, no secrets
