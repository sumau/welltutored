import type { RequestHandler } from "express";
import { HealthCheckResponse } from "../api/schemas";
import { logger } from "./logger";

// Above the time Neon takes to wake a suspended compute, below the 5s timeout
// of the check in fly.toml, so a slow database fails here rather than there.
export const DATABASE_TIMEOUT_MS = 3000;

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`database did not answer within ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The Health Check: answers 200 only when the database answers too. Fly gates
 * a blue-green switch on it, so a bad DATABASE_URL or an unreachable Neon
 * blocks the new version instead of shipping it.
 */
export function healthCheck(
  pingDatabase: () => Promise<unknown>,
  timeoutMs = DATABASE_TIMEOUT_MS,
): RequestHandler {
  return async (_req, res) => {
    try {
      await withTimeout(pingDatabase(), timeoutMs);
    } catch (error) {
      logger.error({ err: error }, "Health Check failed: database unavailable");
      res.status(503).json(HealthCheckResponse.parse({ status: "unavailable" }));
      return;
    }
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  };
}
