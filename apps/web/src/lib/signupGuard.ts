import { createHmac } from "crypto";
import { ApiError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { isLocalTestMode } from "@/lib/localTestMode";

import { SIGNUP_DEVICE_COOKIE } from "@/lib/signupGuardConstants";

export { SIGNUP_DEVICE_COOKIE };

let schemaEnsured = false;

export async function ensureSignupGuardSchema(): Promise<void> {
  if (schemaEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS core.signup_device_links (
      device_hash VARCHAR(64) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_signup_device_links_user
    ON core.signup_device_links(user_id)
  `);
  schemaEnsured = true;
}

function signupGuardDisabled(): boolean {
  return (
    isLocalTestMode() ||
    process.env.SIGNUP_GUARD_DISABLED === "1" ||
    process.env.SIGNUP_GUARD_DISABLED === "true"
  );
}

function deviceHash(deviceId: string): string {
  const secret =
    process.env.SIGNUP_GUARD_SECRET ||
    process.env.JWT_SECRET ||
    "dev-only-change-me-in-production-32chars";
  return createHmac("sha256", secret).update(deviceId).digest("hex");
}

/** Reject if this browser already used for registration. */
export async function assertDeviceMayRegister(deviceId: string | undefined): Promise<void> {
  if (signupGuardDisabled() || !deviceId?.trim()) return;

  await ensureSignupGuardSchema();
  const hash = deviceHash(deviceId.trim());
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM core.signup_device_links WHERE device_hash = $1 LIMIT 1`,
    [hash]
  );
  if (rows[0]) {
    throw new ApiError("SIGNUP_ALREADY_USED");
  }
}

export async function linkDeviceToUser(
  deviceId: string | undefined,
  userId: string
): Promise<void> {
  if (signupGuardDisabled() || !deviceId?.trim()) return;

  await ensureSignupGuardSchema();
  const hash = deviceHash(deviceId.trim());
  await query(
    `INSERT INTO core.signup_device_links (device_hash, user_id)
     VALUES ($1, $2)
     ON CONFLICT (device_hash) DO NOTHING`,
    [hash, userId]
  );
}
