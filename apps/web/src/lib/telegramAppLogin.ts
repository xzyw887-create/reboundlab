import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { ensureTelegramAuthSchema } from "@/lib/telegramLogin";

const TOKEN_RE = /^[a-f0-9]{32}$/;

function botUsername(): string {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    process.env.TELEGRAM_BOT_USERNAME ||
    "Btpkod_bot"
  ).replace(/^@/, "");
}

async function ensureLoginChallenges(): Promise<void> {
  await ensureTelegramAuthSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS core.telegram_login_challenges (
      token TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL,
      telegram_id BIGINT,
      telegram_username TEXT,
      first_name TEXT,
      last_name TEXT,
      approved_at TIMESTAMPTZ,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function startTelegramAppLogin(): Promise<{
  token: string;
  tgUrl: string;
  httpsUrl: string;
}> {
  await ensureLoginChallenges();
  const token = randomBytes(16).toString("hex");
  await query(
    `INSERT INTO core.telegram_login_challenges (token, expires_at)
     VALUES ($1, NOW() + INTERVAL '5 minutes')`,
    [token]
  );
  const start = `login_${token}`;
  const name = botUsername();
  return {
    token,
    tgUrl: `tg://resolve?domain=${name}&start=${start}`,
    httpsUrl: `https://t.me/${name}?start=${start}`,
  };
}

export async function approveTelegramAppLogin(
  token: string,
  profile: {
    id: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
): Promise<"ok" | "missing" | "expired"> {
  if (!TOKEN_RE.test(token)) return "missing";
  await ensureLoginChallenges();
  const rows = await query<{ expires_at: Date; consumed_at: Date | null }>(
    `UPDATE core.telegram_login_challenges
     SET telegram_id = $2,
         telegram_username = $3,
         first_name = $4,
         last_name = $5,
         approved_at = NOW()
     WHERE token = $1
       AND consumed_at IS NULL
       AND expires_at > NOW()
     RETURNING expires_at, consumed_at`,
    [
      token,
      profile.id,
      profile.username?.replace(/^@/, "") || null,
      profile.firstName || null,
      profile.lastName || null,
    ]
  );
  if (rows[0]) return "ok";
  const left = await query<{ expires_at: Date }>(
    `SELECT expires_at FROM core.telegram_login_challenges WHERE token = $1`,
    [token]
  );
  if (!left[0]) return "missing";
  return "expired";
}

export type ApprovedTelegramLogin = {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

export async function takeApprovedTelegramAppLogin(
  token: string
): Promise<ApprovedTelegramLogin | null> {
  if (!TOKEN_RE.test(token)) return null;
  await ensureLoginChallenges();
  const rows = await query<{
    telegram_id: string;
    telegram_username: string | null;
    first_name: string | null;
    last_name: string | null;
  }>(
    `UPDATE core.telegram_login_challenges
     SET consumed_at = NOW()
     WHERE token = $1
       AND approved_at IS NOT NULL
       AND consumed_at IS NULL
       AND expires_at > NOW()
       AND telegram_id IS NOT NULL
     RETURNING telegram_id, telegram_username, first_name, last_name`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.telegram_id),
    username: row.telegram_username,
    firstName: row.first_name,
    lastName: row.last_name,
  };
}
