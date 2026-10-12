import { ApiError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { TRIAL_DURATION_DAYS } from "@/lib/productPolicy";

export { TRIAL_DURATION_DAYS };

let schemaEnsured = false;

export async function ensureTrialPolicySchema(): Promise<void> {
  if (schemaEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS core.telegram_trial_claims (
      telegram_id BIGINT PRIMARY KEY,
      user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    UPDATE core.plans
    SET features = jsonb_set(
      COALESCE(features, '{}'::jsonb),
      '{trial_days}',
      '${TRIAL_DURATION_DAYS}'::jsonb,
      true
    )
    WHERE tier = 'trial'
  `);

  await query(`
    INSERT INTO core.telegram_trial_claims (telegram_id, user_id)
    SELECT telegram_id, id FROM core.users
    WHERE telegram_id IS NOT NULL
    ON CONFLICT (telegram_id) DO NOTHING
  `);

  schemaEnsured = true;
}

/** Один Telegram навсегда = один пробный период (даже если аккаунт удалят). */
export async function assertTelegramMayClaimTrial(telegramId: number): Promise<void> {
  await ensureTrialPolicySchema();
  const rows = await query<{ telegram_id: string }>(
    `SELECT telegram_id FROM core.telegram_trial_claims WHERE telegram_id = $1 LIMIT 1`,
    [telegramId]
  );
  if (rows[0]) {
    throw new ApiError("TRIAL_ALREADY_CLAIMED");
  }
}

export async function recordTelegramTrialClaim(
  telegramId: number,
  userId: string
): Promise<void> {
  await ensureTrialPolicySchema();
  await query(
    `INSERT INTO core.telegram_trial_claims (telegram_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (telegram_id) DO NOTHING`,
    [telegramId, userId]
  );
}

export function trialExpiresIntervalSql(): string {
  return `NOW() + INTERVAL '${TRIAL_DURATION_DAYS} day'`;
}
