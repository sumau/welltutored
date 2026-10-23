import assert from "node:assert/strict";
import test from "node:test";
import { healthCheck } from "../../src/core/health-check";

type Answer = { status: number; body: unknown };

async function runHealthCheck(
  pingDatabase: () => Promise<unknown>,
  timeoutMs?: number,
): Promise<Answer> {
  let answer: Answer = { status: 200, body: undefined };
  const res = {
    status(status: number) {
      answer = { ...answer, status };
      return res;
    },
    json(body: unknown) {
      answer = { ...answer, body };
      return res;
    },
  };
  await healthCheck(pingDatabase, timeoutMs)({} as never, res as never, () => {
    assert.fail("the Health Check called next");
  });
  return answer;
}

test("answers ok when the database answers", async () => {
  assert.deepEqual(await runHealthCheck(async () => ({ rows: [{ "?column?": 1 }] })), {
    status: 200,
    body: { status: "ok" },
  });
});

test("answers 503 when the database query fails", async () => {
  assert.deepEqual(
    await runHealthCheck(async () => {
      throw new Error("connect ECONNREFUSED");
    }),
    { status: 503, body: { status: "unavailable" } },
  );
});

test("answers 503 when the database does not answer in time", async () => {
  const started = Date.now();
  const answer = await runHealthCheck(() => new Promise(() => {}), 50);
  assert.deepEqual(answer, { status: 503, body: { status: "unavailable" } });
  assert.ok(Date.now() - started < 1000, "the timeout did not cut the wait short");
});
