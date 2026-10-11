import { query } from "@/lib/db";

let ensured = false;

export async function ensureBillingSchema(): Promise<void> {
  if (ensured) return;
  await query(`
    ALTER TABLE core.subscriptions
    ADD COLUMN IF NOT EXISTS billing_anchor_day SMALLINT
  `);
  ensured = true;
}
