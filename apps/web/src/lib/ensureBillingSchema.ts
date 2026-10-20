import { query } from "@/lib/db";

let ensured = false;

export async function ensureBillingSchema(): Promise<void> {
  if (ensured) return;
  await query(`
    ALTER TABLE core.subscriptions
    ADD COLUMN IF NOT EXISTS billing_anchor_day SMALLINT,
    ADD COLUMN IF NOT EXISTS trial_started BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS autopay_tier TEXT,
    ADD COLUMN IF NOT EXISTS autopay_interval TEXT,
    ADD COLUMN IF NOT EXISTS autopay_amount_rub INTEGER,
    ADD COLUMN IF NOT EXISTS next_charge_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS autopay_status TEXT NOT NULL DEFAULT 'idle',
    ADD COLUMN IF NOT EXISTS last_charge_at TIMESTAMPTZ
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS core.saved_payment_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
      yookassa_method_id TEXT NOT NULL,
      method_type TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      purpose TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS saved_payment_methods_external_id
    ON core.saved_payment_methods (yookassa_method_id)
  `);
  await query(`
    ALTER TABLE core.users
    ADD COLUMN IF NOT EXISTS flow_preview BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`
    UPDATE core.users
    SET flow_preview = FALSE
    WHERE flow_preview = TRUE
  `);
  await query(`
    UPDATE core.plans
    SET price_rub = 1
    WHERE tier IN ('starter', 'pro', 'automatic')
  `);
  ensured = true;
}
