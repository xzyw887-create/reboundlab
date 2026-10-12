import { query } from "@/lib/db";
import type { PlanTier } from "@/lib/subscriptionTiers";

let schemaEnsured = false;

export async function ensureBillingPaymentsSchema(): Promise<void> {
  if (schemaEnsured) return;
  await query(`
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
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_billing_payments_user
    ON core.billing_payments(user_id, created_at DESC)
  `);
  schemaEnsured = true;
}

export type BillingPaymentRow = {
  id: string;
  user_id: string;
  tier: string;
  amount_rub: number;
  yookassa_payment_id: string | null;
  status: string;
  created_at: Date;
  paid_at: Date | null;
  activated_at: Date | null;
};

export async function insertPendingBillingPayment(
  userId: string,
  tier: PlanTier,
  amountRub: number
): Promise<string> {
  await ensureBillingPaymentsSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO core.billing_payments (user_id, tier, amount_rub, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    [userId, tier, amountRub]
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("PAYMENT_ROW_FAILED");
  return id;
}

export async function attachYooPaymentId(
  localPaymentId: string,
  yookassaPaymentId: string
): Promise<void> {
  await ensureBillingPaymentsSchema();
  await query(
    `UPDATE core.billing_payments
     SET yookassa_payment_id = $2
     WHERE id = $1 AND yookassa_payment_id IS NULL`,
    [localPaymentId, yookassaPaymentId]
  );
}

export async function insertBillingPayment(
  userId: string,
  tier: PlanTier,
  amountRub: number,
  yookassaPaymentId: string
): Promise<string> {
  await ensureBillingPaymentsSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO core.billing_payments (user_id, tier, amount_rub, yookassa_payment_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id`,
    [userId, tier, amountRub, yookassaPaymentId]
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("PAYMENT_ROW_FAILED");
  return id;
}

export async function findPaymentByYooId(
  yookassaPaymentId: string
): Promise<BillingPaymentRow | null> {
  await ensureBillingPaymentsSchema();
  const rows = await query<BillingPaymentRow>(
    `SELECT id, user_id, tier, amount_rub, yookassa_payment_id, status,
            created_at, paid_at, activated_at
     FROM core.billing_payments
     WHERE yookassa_payment_id = $1
     LIMIT 1`,
    [yookassaPaymentId]
  );
  return rows[0] ?? null;
}

export async function findPaymentForUser(
  paymentId: string,
  userId: string
): Promise<BillingPaymentRow | null> {
  await ensureBillingPaymentsSchema();
  const rows = await query<BillingPaymentRow>(
    `SELECT id, user_id, tier, amount_rub, yookassa_payment_id, status,
            created_at, paid_at, activated_at
     FROM core.billing_payments
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [paymentId, userId]
  );
  return rows[0] ?? null;
}

export async function markPaymentSucceeded(
  yookassaPaymentId: string,
  activated: boolean
): Promise<void> {
  await ensureBillingPaymentsSchema();
  await query(
    `UPDATE core.billing_payments
     SET status = 'succeeded',
         paid_at = COALESCE(paid_at, NOW()),
         activated_at = CASE WHEN $2 THEN COALESCE(activated_at, NOW()) ELSE activated_at END
     WHERE yookassa_payment_id = $1`,
    [yookassaPaymentId, activated]
  );
}
