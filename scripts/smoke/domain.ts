import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSmokeDeadline,
  expectStatus,
  parseHttpUrl,
  parseJson,
  reportPassed,
  request,
  requireRecord,
  resolveBaseUrl,
  resolveTimeoutMs,
  resolveTotalTimeoutMs,
  SmokeCheckError,
  type SmokeDeadline,
} from "./shared.js";

// The Domain Smoke: the domain setup around the Deployment holds. It needs
// live DNS and certificates, so it runs only in the Prod Smoke.
const REDIRECT_FROM_ENV_KEY = "SMOKE_REDIRECT_FROM";
const CLERK_FRONTEND_API_ENV_KEY = "SMOKE_CLERK_FRONTEND_API";
// A page path with a query, so a redirect that drops either is caught.
const REDIRECT_PROBE_PATH = "/enquire?smoke=redirect";

/**
 * The origins that must permanently redirect to the target: every other
 * hostname the Deployment answers on. Required, and validated before any
 * request is made, like the target itself.
 */
export function resolveRedirectSources(baseUrl: URL): URL[] {
  const configured = (process.env[REDIRECT_FROM_ENV_KEY] ?? "")
    .split(/[,\s]+/)
    .filter(Boolean);
  if (configured.length === 0) {
    throw new SmokeCheckError(
      `${REDIRECT_FROM_ENV_KEY} must list the origins that redirect to the ` +
        `Public Origin, such as https://www.welltutored.co.uk.`,
    );
  }

  return configured.map((value) => {
    const source = parseHttpUrl(value, REDIRECT_FROM_ENV_KEY);
    if (source.pathname !== "/" || source.search || source.hash) {
      throw new SmokeCheckError(
        `${REDIRECT_FROM_ENV_KEY} must list bare origins; received "${value}".`,
      );
    }
    if (source.origin === baseUrl.origin) {
      throw new SmokeCheckError(
        `${REDIRECT_FROM_ENV_KEY} lists the target "${baseUrl.origin}" itself.`,
      );
    }
    return source;
  });
}

/**
 * The origin of the Deployment's Clerk production instance, such as
 * https://clerk.welltutored.co.uk. Required, because workspace sign-in is
 * part of a usable Deployment.
 */
export function resolveClerkFrontendApi(): URL {
  const configured = process.env[CLERK_FRONTEND_API_ENV_KEY]?.trim();
  if (!configured) {
    throw new SmokeCheckError(
      `${CLERK_FRONTEND_API_ENV_KEY} must name the Clerk production instance's ` +
        `Frontend API, such as https://clerk.welltutored.co.uk.`,
    );
  }
  const frontendApi = parseHttpUrl(configured, CLERK_FRONTEND_API_ENV_KEY);
  if (frontendApi.pathname !== "/" || frontendApi.search || frontendApi.hash) {
    throw new SmokeCheckError(
      `${CLERK_FRONTEND_API_ENV_KEY} must be a bare origin; received "${configured}".`,
    );
  }
  return frontendApi;
}

async function checkRedirect(
  source: URL,
  target: URL,
  timeoutMs: number,
  deadline: SmokeDeadline,
) {
  const label = `${source.origin} redirects to ${target.origin}`;
  // Requested against the source itself with redirects left unfollowed, so the
  // response checked is the redirect rather than wherever it leads.
  const data = await request(
    source,
    REDIRECT_PROBE_PATH,
    timeoutMs,
    { redirect: "manual", headers: { Accept: "text/html" } },
    deadline,
  );
  expectStatus(data, 301, label);
  const expected = new URL(REDIRECT_PROBE_PATH, target).toString();
  const location = data.response.headers.get("location");
  if (location !== expected) {
    throw new SmokeCheckError(
      `${label}: expected Location "${expected}", received "${location ?? "none"}".`,
    );
  }
  return label;
}

/**
 * Requested from Clerk directly, so a failure here is the instance or its
 * clerk.<domain> CNAME and certificate, not the Deployment. The environment
 * type catches a development key shipped by mistake: it would still answer.
 */
async function checkClerkFrontendApi(
  frontendApi: URL,
  timeoutMs: number,
  deadline: SmokeDeadline,
) {
  const label = new URL("/v1/environment", frontendApi).toString();
  const data = await request(
    frontendApi,
    "/v1/environment",
    timeoutMs,
    undefined,
    deadline,
  );
  expectStatus(data, 200, label);
  const environment = requireRecord(parseJson(data, label), label);
  const authConfig = requireRecord(
    environment.auth_config,
    `${label} auth_config`,
  );
  const displayConfig = requireRecord(
    environment.display_config,
    `${label} display_config`,
  );
  if (authConfig.object !== "auth_config") {
    throw new SmokeCheckError(`${label}: unexpected auth_config object.`);
  }
  if (displayConfig.instance_environment_type !== "production") {
    throw new SmokeCheckError(
      `${label}: expected a production instance, received ` +
        `"${String(displayConfig.instance_environment_type)}".`,
    );
  }
  return label;
}

export async function runSmokeCheck() {
  const baseUrl = resolveBaseUrl();
  const redirectSources = resolveRedirectSources(baseUrl);
  const clerkFrontendApi = resolveClerkFrontendApi();
  const timeoutMs = resolveTimeoutMs();
  const totalTimeoutMs = resolveTotalTimeoutMs();
  const deadline = createSmokeDeadline(totalTimeoutMs);

  try {
    const passed: string[] = [];
    passed.push(
      await checkClerkFrontendApi(clerkFrontendApi, timeoutMs, deadline),
    );
    for (const source of redirectSources) {
      passed.push(await checkRedirect(source, baseUrl, timeoutMs, deadline));
    }

    deadline.assertAvailable("domain smoke check completion");
    reportPassed("Domain", baseUrl, passed);
  } finally {
    deadline.close();
  }
}

export async function main(): Promise<number> {
  try {
    await runSmokeCheck();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Domain smoke check failed: ${message}`);
    return 1;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentFile = resolve(fileURLToPath(import.meta.url));

if (invokedFile === currentFile) {
  process.exitCode = await main();
}
