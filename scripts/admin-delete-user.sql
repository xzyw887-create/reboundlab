-- Ручное удаление пользователя в psql (152-ФЗ / запрос на удаление).
-- Проще и безопаснее: ./scripts/admin-user.sh delete <uuid>
--
--   psql "$DATABASE_URL" \
--     -v user_id=550e8400-e29b-41d4-a716-446655440000 \
--     -f scripts/admin-delete-user.sql
--
-- Найти uuid по Telegram:
--   SELECT id, telegram_id, telegram_username FROM core.users WHERE telegram_id = 123456789;

BEGIN;

DELETE FROM core.backtest_runs WHERE user_id = :user_id::uuid;

DELETE FROM core.password_reset_tokens WHERE user_id = :user_id::uuid;
DELETE FROM core.signup_device_links WHERE user_id = :user_id::uuid;
DELETE FROM core.subscriptions WHERE user_id = :user_id::uuid;

DELETE FROM core.telegram_trial_claims t
USING core.users u
WHERE u.id = :user_id::uuid AND t.telegram_id = u.telegram_id;

DELETE FROM core.users WHERE id = :user_id::uuid;

COMMIT;
