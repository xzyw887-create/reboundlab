import { createHash, createHmac } from "crypto";
import { query } from "@/lib/db";

let schemaEnsured = false;

export interface TelegramWidgetAuth {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export async function ensureTelegramAuthSchema(): Promise<void> {
  if (schemaEnsured) return;
  await query(`
    ALTER TABLE core.users
    ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE
  `);
  await query(`
    ALTER TABLE core.users
    ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255)
  `);
  await query(`
    ALTER TABLE core.users
    ALTER COLUMN password_hash DROP NOT NULL
  `);
  schemaEnsured = true;
}

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/** https://core.telegram.org/widgets/login#checking-authorization */
export function verifyTelegramWidgetAuth(payload: TelegramWidgetAuth): boolean {
  const token = botToken();
  if (!token || !payload.hash) return false;

  const maxAgeSec = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SEC || 86400);
  const now = Math.floor(Date.now() / 1000);
  if (payload.auth_date < now - maxAgeSec) return false;

  const entries: Record<string, string> = {};
  entries.id = String(payload.id);
  entries.auth_date = String(payload.auth_date);
  if (payload.first_name != null) entries.first_name = String(payload.first_name);
  if (payload.last_name != null) entries.last_name = String(payload.last_name);
  if (payload.username != null) entries.username = String(payload.username);
  if (payload.photo_url != null) entries.photo_url = String(payload.photo_url);

  const dataCheckString = Object.keys(entries)
    .sort()
    .map((k) => `${k}=${entries[k]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(token).digest();
  const hmac = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === payload.hash;
}
