import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../models";
import { logger } from "./logger";

const { Pool } = pg;

const isIntegrationTest = process.env.NODE_ENV === "test";
const applicationDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (isIntegrationTest && !testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set for integration tests; refusing to use DATABASE_URL.",
  );
}

if (
  isIntegrationTest &&
  applicationDatabaseUrl &&
  testDatabaseUrl === applicationDatabaseUrl
) {
  throw new Error(
    "TEST_DATABASE_URL must be different from DATABASE_URL; integration tests cannot use an application database.",
  );
}

const databaseUrl = isIntegrationTest ? testDatabaseUrl : applicationDatabaseUrl;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
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
