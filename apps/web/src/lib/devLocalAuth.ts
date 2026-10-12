import { ApiError } from "@/lib/apiErrors";
import {
  createSessionToken,
  getAuthUser,
  setSessionCookie,
  type AuthUser,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureTelegramAuthSchema } from "@/lib/telegramLogin";

/** Фиксированный dev-пользователь (не Telegram). */
export const DEV_LOCAL_EMAIL = "dev-local@backtestpro.test";
export const DEV_LOCAL_DISPLAY_NAME = "Dev Local";

/** Сервер: только `npm run dev` + явный флаг в .env.local */
export function devLocalAuthAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_LOCAL_AUTH === "1"
  );
}

export async function loginOrCreateDevLocalUser(): Promise<AuthUser> {
  if (!devLocalAuthAllowed()) {
    throw new ApiError("NOT_FOUND");
  }

  await ensureTelegramAuthSchema();

  const existing = await query<{ id: string; email: string }>(
    `SELECT id, email FROM core.users
     WHERE email = $1 AND status = 'active'
     LIMIT 1`,
    [DEV_LOCAL_EMAIL]
  );

  let userId: string;

  if (existing[0]) {
    userId = existing[0].id;
    await query(
      `UPDATE core.users
       SET telegram_display_name = $1, updated_at = NOW()
       WHERE id = $2`,
      [DEV_LOCAL_DISPLAY_NAME, userId]
    );
  } else {
    const inserted = await query<{ id: string }>(
      `INSERT INTO core.users (email, password_hash, telegram_display_name)
       VALUES ($1, NULL, $2)
       RETURNING id`,
      [DEV_LOCAL_EMAIL, DEV_LOCAL_DISPLAY_NAME]
    );
    userId = inserted[0]?.id ?? "";
    if (!userId) throw new ApiError("REGISTER_FAILED");

    await query(
      `INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at)
       SELECT $1, p.id, 'active', NOW() + INTERVAL '10 years'
       FROM core.plans p WHERE p.tier = 'pro'`,
      [userId]
    );
  }

  const token = await createSessionToken(userId, DEV_LOCAL_EMAIL);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new ApiError("LOGIN_FAILED");
  return user;
}
