import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../models";
import { databaseUrl } from "./config";
import { logger } from "./logger";

const { Pool } = pg;

export const pool = new Pool({ connectionString: databaseUrl() });
export const db = drizzle(pool, { schema });

/**
 * Postgres ends idle connections when it restarts, and Neon restarts its
 * compute for updates. pg-pool has already dropped the broken connection and
 * the next query opens a new one, so all that is left is to log it: with no
 * `error` listener, Node treats the event as fatal and the process exits.
 */
export function logPoolErrors(pool: pg.Pool): void {
  pool.on("error", (err) => {
    logger.error({ err }, "Database ended an idle connection");
  });
}
