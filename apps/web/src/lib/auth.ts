import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/apiErrors";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { query } from "@/lib/db";
import { canonicalEmail } from "@/lib/emailCanonical";
import { isDisposableEmail } from "@/lib/disposableEmailDomains";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import { telegramPlaceholderEmail } from "@/lib/telegramIdentity";
import {
  ensureTelegramAuthSchema,
  type TelegramWidgetAuth,
} from "@/lib/telegramLogin";
import {
  assertTelegramMayClaimTrial,
  recordTelegramTrialClaim,
  trialExpiresIntervalSql,
} from "@/lib/trialPolicy";

const COOKIE_NAME = "btp_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-change-me-in-production-32chars"
);

export interface AuthUser {
  id: string;
  email: string;
  planTier: PlanTier;
  planDbTier: string;
  subscriptionStatus: string;
  expiresAt: string | null;
  /** YYYY-MM-DD — якорь окна «3 месяца с регистрации» */
  registeredAt: string;
  trialExpired: boolean;
  /** Платная подписка истекла (Basic/Pro) */
  subscriptionExpired: boolean;
  /** День месяца первой оплаты (1–31), null на trial */
  billingAnchorDay: number | null;
  telegramId: number | null;
  telegramUsername: string | null;
}

export function mapDbTierToUi(dbTier: string): PlanTier {
  if (dbTier === "starter") return "basic";
  if (dbTier === "pro") return "pro";
  if (dbTier === "automatic") return "automatic";
  return "trial";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

export async function readSessionToken(): Promise<{ userId: string; email: string } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub;
    const email = payload.email;
    if (!userId || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await readSessionToken();
  if (!session) return null;

  await ensureBillingSchema();

  const rows = await query<{
    id: string;
    email: string;
    tier: string;
    status: string;
    expires_at: Date | null;
    billing_anchor_day: number | null;
    created_at: Date;
    telegram_id: string | null;
    telegram_username: string | null;
  }>(
    `SELECT u.id, u.email, p.tier, s.status, s.expires_at, s.billing_anchor_day, u.created_at,
            u.telegram_id, u.telegram_username
     FROM core.users u
     JOIN core.subscriptions s ON s.user_id = u.id
     JOIN core.plans p ON p.id = s.plan_id
     WHERE u.id = $1 AND u.status = 'active'
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [session.userId]
  );

  const row = rows[0];
  if (!row) return null;

  const expiresAt = row.expires_at ? row.expires_at.toISOString() : null;
  const pastExpiry =
    row.expires_at != null && row.expires_at.getTime() < Date.now();
  const trialExpired = row.tier === "trial" && pastExpiry;
  const subscriptionExpired = row.tier !== "trial" && pastExpiry;

  return {
    id: row.id,
    email: row.email,
    planTier: mapDbTierToUi(row.tier),
    planDbTier: row.tier,
    subscriptionStatus: row.status,
    expiresAt,
    registeredAt: row.created_at.toISOString().slice(0, 10),
    trialExpired,
    subscriptionExpired,
    billingAnchorDay: row.billing_anchor_day,
    telegramId: row.telegram_id != null ? Number(row.telegram_id) : null,
    telegramUsername: row.telegram_username,
  };
}

export async function registerUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalized = canonicalEmail(email);
  if (!normalized.includes("@")) {
    throw new ApiError("INVALID_EMAIL");
  }
  if (isDisposableEmail(normalized)) {
    throw new ApiError("DISPOSABLE_EMAIL");
  }
  if (password.length < 8) {
    throw new ApiError("PASSWORD_TOO_SHORT");
  }

  const passwordHash = await hashPassword(password);

  const users = await query<{ id: string }>(
    `INSERT INTO core.users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id`,
    [normalized, passwordHash]
  );
  const userId = users[0]?.id;
  if (!userId) throw new ApiError("REGISTER_FAILED");

  await query(
    `INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at)
     SELECT $1, p.id, 'trial', ${trialExpiresIntervalSql()}
     FROM core.plans p WHERE p.tier = 'trial'`,
    [userId]
  );

  const token = await createSessionToken(userId, normalized);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new ApiError("LOGIN_AFTER_REGISTER_FAILED");
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalized = canonicalEmail(email);
  const rows = await query<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM core.users
     WHERE email = $1 AND status = 'active'`,
    [normalized]
  );
  const row = rows[0];
  if (!row) throw new ApiError("INVALID_CREDENTIALS");
  if (!row.password_hash) {
    throw new ApiError("LOGIN_USE_TELEGRAM");
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw new ApiError("INVALID_CREDENTIALS");

  const token = await createSessionToken(row.id, row.email);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new ApiError("LOGIN_FAILED");
  return user;
}

export async function loginOrRegisterViaTelegram(
  payload: TelegramWidgetAuth
): Promise<{ user: AuthUser; isNew: boolean }> {
  await ensureTelegramAuthSchema();

  const tgId = payload.id;
  const username = payload.username?.replace(/^@/, "") ?? null;

  const existing = await query<{ id: string; email: string }>(
    `SELECT id, email FROM core.users
     WHERE telegram_id = $1 AND status = 'active'
     LIMIT 1`,
    [tgId]
  );

  if (existing[0]) {
    if (username) {
      await query(
        `UPDATE core.users SET telegram_username = $1, updated_at = NOW() WHERE id = $2`,
        [username, existing[0].id]
      );
    }
    await recordTelegramTrialClaim(tgId, existing[0].id);
    const token = await createSessionToken(existing[0].id, existing[0].email);
    setSessionCookie(token);
    const user = await getAuthUser();
    if (!user) throw new ApiError("LOGIN_FAILED");
    return { user, isNew: false };
  }

  await assertTelegramMayClaimTrial(tgId);

  const email = telegramPlaceholderEmail(tgId);
  const inserted = await query<{ id: string }>(
    `INSERT INTO core.users (email, password_hash, telegram_id, telegram_username)
     VALUES ($1, NULL, $2, $3)
     RETURNING id`,
    [email, tgId, username]
  );
  const userId = inserted[0]?.id;
  if (!userId) throw new ApiError("REGISTER_FAILED");

  await query(
    `INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at)
     SELECT $1, p.id, 'trial', ${trialExpiresIntervalSql()}
     FROM core.plans p WHERE p.tier = 'trial'`,
    [userId]
  );

  await recordTelegramTrialClaim(tgId, userId);

  const token = await createSessionToken(userId, email);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new ApiError("LOGIN_AFTER_REGISTER_FAILED");
  return { user, isNew: true };
}

export async function userExistsByTelegramId(telegramId: number): Promise<boolean> {
  await ensureTelegramAuthSchema();
  const rows = await query<{ id: string }>(
    `SELECT id FROM core.users WHERE telegram_id = $1 AND status = 'active' LIMIT 1`,
    [telegramId]
  );
  return Boolean(rows[0]);
}

export function authUserJson(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    planTier: user.planTier,
    planDbTier: user.planDbTier,
    subscriptionStatus: user.subscriptionStatus,
    expiresAt: user.expiresAt,
    registeredAt: user.registeredAt,
    trialExpired: user.trialExpired,
    subscriptionExpired: user.subscriptionExpired,
    billingAnchorDay: user.billingAnchorDay,
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
  };
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns raw token for email link, or null if user not found (caller still shows generic success). */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalized = canonicalEmail(email);
  const rows = await query<{ id: string }>(
    `SELECT id FROM core.users WHERE email = $1 AND status = 'active'`,
    [normalized]
  );
  const user = rows[0];
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);

  await query(
    `DELETE FROM core.password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );
  await query(
    `INSERT INTO core.password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [user.id, tokenHash]
  );

  return token;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) {
    throw new ApiError("PASSWORD_TOO_SHORT");
  }

  const tokenHash = hashResetToken(token);
  const rows = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM core.password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) throw new ApiError("RESET_LINK_INVALID");

  const passwordHash = await hashPassword(newPassword);
  await query(`UPDATE core.users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
    passwordHash,
    row.user_id,
  ]);
  await query(`UPDATE core.password_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);
}

export function passwordResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password?token=${token}`;
}
