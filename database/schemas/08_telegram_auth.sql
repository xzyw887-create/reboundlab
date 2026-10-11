-- Telegram Login Widget (one telegram_id = one user)

ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);

ALTER TABLE core.users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id
  ON core.users(telegram_id)
  WHERE telegram_id IS NOT NULL;
