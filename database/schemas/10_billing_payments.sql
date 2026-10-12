-- Платежи ЮKassa (создаётся также через ensureBillingPaymentsSchema в web)

CREATE TABLE IF NOT EXISTS core.billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    tier VARCHAR(16) NOT NULL,
    amount_rub INTEGER NOT NULL,
    yookassa_payment_id VARCHAR(64) UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_user
    ON core.billing_payments(user_id, created_at DESC);
