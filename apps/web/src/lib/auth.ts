import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { query } from "@/lib/db";

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
}

function mapDbTierToUi(dbTier: string): PlanTier {
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

  const rows = await query<{
    id: string;
    email: string;
    tier: string;
    status: string;
    expires_at: Date | null;
    created_at: Date;
  }>(
    `SELECT u.id, u.email, p.tier, s.status, s.expires_at, u.created_at
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
  const trialExpired =
    row.tier === "trial" &&
    row.expires_at != null &&
    row.expires_at.getTime() < Date.now();

  return {
    id: row.id,
    email: row.email,
    planTier: trialExpired ? "trial" : mapDbTierToUi(row.tier),
    planDbTier: row.tier,
    subscriptionStatus: row.status,
    expiresAt,
    registeredAt: row.created_at.toISOString().slice(0, 10),
    trialExpired,
  };
}

export async function registerUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Введите корректный email");
  }
  if (password.length < 8) {
    throw new Error("Пароль — минимум 8 символов");
  }

  const passwordHash = await hashPassword(password);

  const users = await query<{ id: string }>(
    `INSERT INTO core.users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id`,
    [normalized, passwordHash]
  );
  const userId = users[0]?.id;
  if (!userId) throw new Error("Не удалось создать пользователя");

  await query(
    `INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at)
     SELECT $1, p.id, 'trial', NOW() + INTERVAL '3 days'
     FROM core.plans p WHERE p.tier = 'trial'`,
    [userId]
  );

  const token = await createSessionToken(userId, normalized);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new Error("Ошибка входа после регистрации");
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  const rows = await query<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM core.users
     WHERE email = $1 AND status = 'active'`,
    [normalized]
  );
  const row = rows[0];
  if (!row) throw new Error("Неверный email или пароль");

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw new Error("Неверный email или пароль");

  const token = await createSessionToken(row.id, row.email);
  setSessionCookie(token);

  const user = await getAuthUser();
  if (!user) throw new Error("Ошибка входа");
  return user;
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
  };
}
