-- Один Telegram = один пробный период навсегда

CREATE TABLE IF NOT EXISTS core.telegram_trial_claims (
    telegram_id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE core.plans
SET features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{trial_days}',
    '1'::jsonb,
    true
)
WHERE tier = 'trial';
