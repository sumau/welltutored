// What every Smoke shares: its target, its timeouts, and for the HTTP Smokes,
// the request and response checks.
const BASE_URL_ENV_KEY = "SMOKE_BASE_URL";
export const SMOKE_TIMEOUT_MIN_MS = 100;
export const SMOKE_TIMEOUT_MAX_MS = 60_000;
export const SMOKE_TOTAL_TIMEOUT_MIN_MS = 1_000;
export const SMOKE_TOTAL_TIMEOUT_MAX_MS = 300_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 60_000;
const SMOKE_TIMEOUT_FORMAT = /^\d+$/;

export type JsonRecord = Record<string, unknown>;

export type ResponseData = {
  response: Response;
  body: string;
  contentType: string;
};

export class SmokeCheckError extends Error {}

export type SmokeDeadline = {
  timeoutMs: number;
  signal: AbortSignal;
  remainingMs: () => number;
  assertAvailable: (path: string) => void;
  isExpired: () => boolean;
  close: () => void;
};

function overallDeadlineError(path: string, timeoutMs: number) {
  return new SmokeCheckError(
    `${path}: overall smoke check timed out after ${timeoutMs}ms. ` +
      `Increase SMOKE_TOTAL_TIMEOUT_MS only if this target is expected to be slow, ` +
      `or fix the slow or unavailable check.`,
  );
}

export function createSmokeDeadline(timeoutMs: number): SmokeDeadline {
  const controller = new AbortController();
  const startedAt = Date.now();
  let expired = false;
  const expire = () => {
    if (expired) return;
    expired = true;
    controller.abort();
  };
  const timer = setTimeout(expire, timeoutMs);

  return {
    timeoutMs,
    signal: controller.signal,
    remainingMs: () => Math.max(0, timeoutMs - (Date.now() - startedAt)),
    assertAvailable: (path: string) => {
      if (expired || Date.now() - startedAt >= timeoutMs) {
        expire();
        throw overallDeadlineError(path, timeoutMs);
      }
    },
    isExpired: () => expired || Date.now() - startedAt >= timeoutMs,
    close: () => clearTimeout(timer),
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    throw new SmokeCheckError(`${label}: expected a JSON object.`);
  }
  return value;
}

export function requireNonEmptyString(
  value: unknown,
  field: string,
  label: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SmokeCheckError(
      `${label}: expected a non-empty "${field}" string.`,
    );
  }
  return value;
}

export function requireInteger(
  value: unknown,
  field: string,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new SmokeCheckError(`${label}: expected an integer "${field}".`);
  }
  return value;
}

export function requireArray(
  value: unknown,
  field: string,
  label: string,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new SmokeCheckError(`${label}: expected an array "${field}".`);
  }
  return value;
}

export function parseJson(data: ResponseData, label: string): unknown {
  if (!data.contentType.toLowerCase().includes("application/json")) {
    throw new SmokeCheckError(
      `${label}: expected JSON content, received "${data.contentType || "none"}".`,
    );
  }

  try {
    return JSON.parse(data.body) as unknown;
  } catch {
    throw new SmokeCheckError(`${label}: response was not valid JSON.`);
  }
}

export function expectStatus(
  data: ResponseData,
  expected: number,
  label: string,
) {
  if (data.response.status !== expected) {
    const bodyPreview = data.body.replace(/\s+/g, " ").slice(0, 180);
    throw new SmokeCheckError(
      `${label}: expected HTTP ${expected}, received ${data.response.status}.` +
        (bodyPreview ? ` Body: ${bodyPreview}` : ""),
    );
  }
}

function resolveConfiguredBaseUrl(): { value: string; source: string } {
  const explicit = process.env[BASE_URL_ENV_KEY]?.trim();
  if (!explicit) {
    throw new SmokeCheckError(
      `${BASE_URL_ENV_KEY} must name the target of this check. There is no ` +
        `default: the Deployment's origin is committed in fly.toml, and a ` +
        `smoke check that infers its own target is one that can report on a ` +
        `site nobody asked about.`,
    );
  }

  return { value: explicit, source: BASE_URL_ENV_KEY };
}

export function parseHttpUrl(value: string, source: string): URL {
  let baseUrl: URL;
  try {
    baseUrl = new URL(value);
  } catch {
    throw new SmokeCheckError(
      `${source} must be an absolute HTTP(S) URL; received "${value}".`,
    );
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new SmokeCheckError(
      `${source} must use http or https; received "${baseUrl.protocol}".`,
    );
  }

  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "") || "/";
  return baseUrl;
}

export function resolveBaseUrl(): URL {
  const configured = resolveConfiguredBaseUrl();
  return parseHttpUrl(configured.value, configured.source);
}

export function resolveTimeoutMs(): number {
  const rawConfigured = process.env.SMOKE_TIMEOUT_MS;
  const configured =
    rawConfigured === undefined ? DEFAULT_TIMEOUT_MS : Number(rawConfigured);
  if (
    (rawConfigured !== undefined &&
      !SMOKE_TIMEOUT_FORMAT.test(rawConfigured)) ||
    !Number.isSafeInteger(configured) ||
    configured < SMOKE_TIMEOUT_MIN_MS ||
    configured > SMOKE_TIMEOUT_MAX_MS
  ) {
    throw new SmokeCheckError(
      `SMOKE_TIMEOUT_MS must be an integer number of milliseconds between ` +
        `${SMOKE_TIMEOUT_MIN_MS} and ${SMOKE_TIMEOUT_MAX_MS}; received "${rawConfigured}".`,
    );
  }
  return configured;
}

export function resolveTotalTimeoutMs(): number {
  const rawConfigured = process.env.SMOKE_TOTAL_TIMEOUT_MS;
  const configured =
    rawConfigured === undefined
      ? DEFAULT_TOTAL_TIMEOUT_MS
      : Number(rawConfigured);
  if (
    (rawConfigured !== undefined &&
      !SMOKE_TIMEOUT_FORMAT.test(rawConfigured)) ||
    !Number.isSafeInteger(configured) ||
    configured < SMOKE_TOTAL_TIMEOUT_MIN_MS ||
    configured > SMOKE_TOTAL_TIMEOUT_MAX_MS
  ) {
    throw new SmokeCheckError(
      `SMOKE_TOTAL_TIMEOUT_MS must be an integer number of milliseconds between ` +
        `${SMOKE_TOTAL_TIMEOUT_MIN_MS} and ${SMOKE_TOTAL_TIMEOUT_MAX_MS}; received "${rawConfigured}".`,
    );
  }
  return configured;
}

export async function request(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  init?: RequestInit,
  deadline?: SmokeDeadline,
): Promise<ResponseData> {
  const url = new URL(path, baseUrl);
  deadline?.assertAvailable(path);
  const controller = new AbortController();
  const abortForDeadline = () => controller.abort();
  deadline?.signal.addEventListener("abort", abortForDeadline, { once: true });
  const requestTimeoutMs = Math.max(
    1,
    Math.min(timeoutMs, deadline?.remainingMs() ?? timeoutMs),
  );
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;
  let body: string;

  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
    body = await response.text();
  } catch (error) {
    if (deadline?.isExpired()) {
      throw overallDeadlineError(path, deadline.timeoutMs);
    }
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${requestTimeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new SmokeCheckError(`${path}: request failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
    deadline?.signal.removeEventListener("abort", abortForDeadline);
  }

  const finalUrl = new URL(response.url);
  if (finalUrl.origin !== baseUrl.origin) {
    throw new SmokeCheckError(
      `${path}: response redirected from configured origin "${baseUrl.origin}" ` +
        `to final origin "${finalUrl.origin}".`,
    );
  }

  return {
    response,
    body,
    contentType: response.headers.get("content-type") ?? "",
  };
}

/** Prints the result the same way for every HTTP Smoke. */
export function reportPassed(
  name: string,
  baseUrl: URL,
  passed: string[],
  skipped: string[] = [],
) {
  console.log(`${name} smoke check passed for ${baseUrl.origin}`);
  for (const check of passed) {
    console.log(`  ✓ ${check}`);
  }
  for (const check of skipped) {
    console.log(`  - ${check}`);
  }
}

