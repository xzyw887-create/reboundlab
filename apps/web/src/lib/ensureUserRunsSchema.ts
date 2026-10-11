import { query } from "@/lib/db";

let ensured = false;

/** Creates run history + password reset tables if missing (safe to call repeatedly). */
export async function ensureUserRunsSchema(): Promise<void> {
  if (ensured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS core.backtest_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
      label VARCHAR(200) NOT NULL DEFAULT '',
      params JSONB NOT NULL,
      summary JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_backtest_runs_user_created
      ON core.backtest_runs(user_id, created_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS core.password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
      ON core.password_reset_tokens(user_id)
  `);

  ensured = true;
}
