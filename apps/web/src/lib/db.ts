import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

/** Docker Compose / VPS: postgres service has no TLS on :5432 */
const isLocalDb =
  DATABASE_URL.includes("localhost") ||
  DATABASE_URL.includes("@postgres:") ||
  process.env.DATABASE_SSL === "0";

export function getPool(): Pool {
  if (!global.pgPool) {
    global.pgPool = new Pool({
      connectionString: DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      ssl: isLocalDb ? false : { rejectUnauthorized: false },
    });
  }
  return global.pgPool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const res = await getPool().query(text, params);
    return res.rows as T[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
      throw new Error(
        "База данных не запущена. В терминале: cd ~/Projects/reboundlab && npm run docker:up"
      );
    }
    throw err;
  }
}

/** Один клиент — для SET session + тяжёлого запроса (375 монет). */
export async function queryWithSession<T = unknown>(
  sessionSql: string[],
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    for (const sql of sessionSql) {
      await client.query(sql);
    }
    const res = await client.query(text, params);
    return res.rows as T[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
      throw new Error(
        "База данных не запущена. В терминале: cd ~/Projects/reboundlab && npm run docker:up"
      );
    }
    throw err;
  } finally {
    client.release();
  }
}
