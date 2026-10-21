import assert from "node:assert/strict";
import test, { after } from "node:test";
import { pool } from "@workspace/db";
import { logPoolErrors } from "./pool-errors";

after(async () => {
  await pool.end();
});

// What Postgres does on a restart: end a connection that is idle in the pool.
// Without a listener, pg-pool's `error` event would take the process down.
test("survives the database ending an idle connection", async () => {
  logPoolErrors(pool);

  const idle = await pool.connect();
  const other = await pool.connect();
  const idlePid = (idle as unknown as { processID: number }).processID;
  idle.release();

  // Not events.once: it rejects on any `error` event, handled or not.
  const removed = new Promise((resolve) => pool.once("remove", resolve));
  await other.query("SELECT pg_terminate_backend($1)", [idlePid]);
  other.release();
  await removed;

  const result = await pool.query("SELECT 1 AS answer");
  assert.equal(result.rows[0].answer, 1);
});
