import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.pgPool) {
    global.pgPool = new Pool({
      connectionString: DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
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
