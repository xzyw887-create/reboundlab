import type { PlanTier } from "@/lib/subscriptionTiers";
import { planByTier } from "@/lib/subscriptionTiers";
import { getPool, query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import { ensureTelegramAuthSchema } from "@/lib/telegramLogin";
import { anchorDayFromDate } from "@/lib/billingPeriod";
import { mapDbTierToUi } from "@/lib/auth";

export type AdminUserRow = {
  id: string;
  email: string;
  status: string;
  created_at: Date;
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_display_name: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  expires_at: Date | null;
};

export async function findUserForAdmin(q: string): Promise<AdminUserRow | null> {
  await ensureTelegramAuthSchema();
  await ensureBillingSchema();

  const trimmed = q.trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed
    );

  const baseSelect = `
    SELECT u.id, u.email, u.status, u.created_at,
           u.telegram_id::text, u.telegram_username, u.telegram_display_name,
           p.tier AS plan_tier, s.status AS subscription_status, s.expires_at
    FROM core.users u
    LEFT JOIN LATERAL (
      SELECT plan_id, status, expires_at, created_at
      FROM core.subscriptions
      WHERE user_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN core.plans p ON p.id = s.plan_id
  `;

  if (isUuid) {
    const rows = await query<AdminUserRow>(`${baseSelect} WHERE u.id = $1 LIMIT 1`, [
      trimmed,
    ]);
    return rows[0] ?? null;
  }

  const tgId = Number(trimmed.replace(/^@/, ""));
  if (Number.isFinite(tgId) && tgId > 0) {
    const rows = await query<AdminUserRow>(
      `${baseSelect} WHERE u.telegram_id = $1 LIMIT 1`,
      [tgId]
    );
    return rows[0] ?? null;
  }

  throw new Error("INVALID_LOOKUP");
}

/** Полное удаление аккаунта и связанных данных (152-ФЗ — по запросу субъекта). */
export async function eraseUserAccount(
  userId: string
): Promise<{ deleted: true; telegramId: number | null }> {
  const users = await query<{ telegram_id: string | null }>(
    `SELECT telegram_id FROM core.users WHERE id = $1`,
    [userId]
  );
  const row = users[0];
  if (!row) throw new Error("USER_NOT_FOUND");

  const telegramId = row.telegram_id != null ? Number(row.telegram_id) : null;
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM core.backtest_runs WHERE user_id = $1`, [userId]);
    try {
      await client.query(`DELETE FROM backtest.backtest_runs WHERE user_id = $1`, [userId]);
    } catch {
      /* схема backtest может отсутствовать */
    }
    await client.query(`DELETE FROM core.password_reset_tokens WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(`DELETE FROM core.signup_device_links WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM core.subscriptions WHERE user_id = $1`, [userId]);
    if (telegramId != null) {
      await client.query(`DELETE FROM core.telegram_trial_claims WHERE telegram_id = $1`, [
        telegramId,
      ]);
    }
    await client.query(`DELETE FROM core.users WHERE id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return { deleted: true, telegramId };
}

export type GrantPlan = "trial" | "basic" | "pro";

export async function adminGrantSubscription(
  userId: string,
  plan: GrantPlan,
  days: number
): Promise<{ planTier: PlanTier; expiresAt: string }> {
  if (!Number.isFinite(days) || days < 1 || days > 730) {
    throw new Error("INVALID_DAYS");
  }

  await ensureBillingSchema();

  const uiTier: PlanTier =
    plan === "basic" ? "basic" : plan === "pro" ? "pro" : "trial";
  const def = planByTier(uiTier);
  if (!def) throw new Error("PLAN_NOT_FOUND");

  const planRows = await query<{ id: string }>(
    `SELECT id FROM core.plans WHERE tier = $1`,
    [def.dbTier]
  );
  const planId = planRows[0]?.id;
  if (!planId) throw new Error("PLAN_NOT_IN_DB");

  const subs = await query<{ id: string }>(
    `SELECT id FROM core.subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const subId = subs[0]?.id;
  if (!subId) throw new Error("SUBSCRIPTION_NOT_FOUND");

  const paidAt = new Date();
  const anchor = anchorDayFromDate(paidAt);
  const expiresAt = new Date(paidAt.getTime() + days * 86400000);
  const status = plan === "trial" ? "trial" : "active";

  await query(
    `UPDATE core.subscriptions
     SET plan_id = $1, status = $2, expires_at = $3,
         billing_anchor_day = CASE WHEN $2 = 'active' THEN $4 ELSE billing_anchor_day END,
         started_at = CASE WHEN $2 = 'active' THEN NOW() ELSE started_at END
     WHERE id = $5`,
    [planId, status, expiresAt.toISOString(), anchor, subId]
  );

  return {
    planTier: mapDbTierToUi(def.dbTier),
    expiresAt: expiresAt.toISOString(),
  };
}

export function adminUserJson(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    registeredAt: row.created_at.toISOString().slice(0, 10),
    telegramId: row.telegram_id != null ? Number(row.telegram_id) : null,
    telegramUsername: row.telegram_username,
    telegramDisplayName: row.telegram_display_name,
    planTier: row.plan_tier ? mapDbTierToUi(row.plan_tier) : null,
    subscriptionStatus: row.subscription_status,
    expiresAt: row.expires_at?.toISOString() ?? null,
  };
}
