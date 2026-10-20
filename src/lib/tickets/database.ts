import "server-only";
import { Pool } from "pg";
import type { Database } from "./service";
import { TicketError } from "./domain";
import { validatePreviewDatabase } from "./preview-safety";
let pool: Pool | undefined;
export function configured() {
  return Boolean(process.env.DATABASE_URL);
}
export function database(): Database {
  validatePreviewDatabase(process.env);
  if (!process.env.DATABASE_URL)
    throw new TicketError(
      503,
      "現在受付を準備しています。時間をおいて再度ご確認ください。",
    );
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
    // An idle connection may be closed by a serverless DB. Never emit DB error details.
    pool.on("error", () => {});
  }
  const db = pool;
  return {
    query: async (sql, args) => (await db.query(sql, args)).rows,
    transaction: async (fn) => {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          query: async (sql, args) => (await client.query(sql, args)).rows,
        });
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
