-- BackTest Pro: минимум для регистрации и тарифов
-- Supabase → SQL Editor → New query → вставить всё → Run

CREATE SCHEMA IF NOT EXISTS core;

CREATE TYPE core.user_status AS ENUM ('active', 'banned', 'deleted');
CREATE TYPE core.plan_tier AS ENUM ('trial', 'starter', 'pro', 'automatic');
CREATE TYPE core.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');

CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status core.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier core.plan_tier NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    price_rub DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
    trial_runs INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    plan_id UUID NOT NULL REFERENCES core.plans(id),
    status core.subscription_status NOT NULL DEFAULT 'trial',
    runs_used INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON core.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON core.subscriptions(status);

INSERT INTO core.plans (tier, name, features, price_rub, trial_runs) VALUES
('trial', 'Пробный', '{"max_coins":1,"max_days":90,"trial_days":3,"trailing":false,"averaging":0,"multi_coin":false,"compare_runs":false,"automatic":false,"entry_pct_split":false}', 0, 0),
('starter', 'Базовый', '{"max_coins":1,"max_days":1095,"trailing":false,"averaging":0,"multi_coin":false,"compare_runs":true,"automatic":false,"entry_pct_split":false}', 490, 0),
('pro', 'Продвинутый', '{"max_coins":10,"max_days":1095,"trailing":true,"averaging":3,"multi_coin":true,"compare_runs":true,"automatic":false,"entry_pct_split":true}', 1990, 0),
('automatic', 'Автомат', '{"max_coins":50,"max_days":1095,"trailing":true,"averaging":3,"multi_coin":true,"compare_runs":true,"automatic":true,"entry_pct_split":true}', 4990, 0);

-- Run history + password reset (also in database/schemas/05_user_runs_auth.sql)

CREATE TABLE IF NOT EXISTS core.backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL DEFAULT '',
    params JSONB NOT NULL,
    summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_user_created
    ON core.backtest_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON core.password_reset_tokens(user_id);
