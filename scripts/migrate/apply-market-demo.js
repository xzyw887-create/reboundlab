#!/usr/bin/env node
/**
 * Apply market schema only (safe on Supabase that already has core auth tables).
 * Usage: DATABASE_URL='postgresql://...' node scripts/migrate/apply-market-demo.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = path.resolve(__dirname, "../..");
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const FILES = [
  "database/schemas/02_market.sql",
  "database/schemas/neon_candles.sql",
];

async function runFile(client, rel) {
  const file = path.join(ROOT, rel);
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
      return;
    }
    throw err;
  }
}

async function main() {
  const connUrl = DB_URL.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");
  const client = new Client({
    connectionString: connUrl,
    ssl: connUrl.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected");

  for (const rel of FILES) {
    await runFile(client, rel);
  }

  await client.end();
  console.log("Done. market.* tables ready for candles.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
