#!/usr/bin/env node
/**
 * Apply schemas to Neon / any remote Postgres (no psql required).
 * Usage: DATABASE_URL='postgresql://...' node scripts/migrate/apply-neon.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = path.resolve(__dirname, "../..");
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("Set DATABASE_URL (Neon connection string, sslmode=require)");
  process.exit(1);
}

const FILES = [
  "database/schemas/01_core.sql",
  "database/schemas/02_market.sql",
  "database/schemas/neon_candles.sql",
  "database/schemas/03_backtest.sql",
  "database/schemas/04_funding_rates.sql",
  "database/schemas/05_user_runs_auth.sql",
  "database/schemas/06_billing_anchor.sql",
  "database/schemas/07_signup_guard.sql",
  "database/schemas/08_telegram_auth.sql",
  "database/schemas/09_trial_claims.sql",
  "database/schemas/10_billing_payments.sql",
];

async function main() {
  const noSsl =
    DB_URL.includes("localhost") ||
    DB_URL.includes("@postgres:") ||
    process.env.DATABASE_SSL === "0";
  const client = new Client({
    connectionString: DB_URL,
    ssl: noSsl ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected to Neon/Postgres");

  for (const rel of FILES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      console.log("Skip (missing):", rel);
      continue;
    }
    const sql = fs.readFileSync(file, "utf8");
    console.log("→", rel);
    try {
      await client.query(sql);
    } catch (err) {
      const msg = err.message || String(err);
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate key") ||
        msg.includes("duplicate_object")
      ) {
        console.log("  (skip — already applied)");
        continue;
      }
      throw err;
    }
  }

  await client.end();
  console.log("Done. Auth tables (core.users, core.plans) ready.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
