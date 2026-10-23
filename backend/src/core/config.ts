/**
 * Every setting the API reads from its environment, in one place;
 * docs/configuration.md describes each one.
 *
 * Settings are read when asked for, not once when this module loads: a test
 * passes its own environment, and a missing setting fails where it is used,
 * as it always has.
 */
export type Environment = Record<string, string | undefined>;

export function isProduction(environment: Environment = process.env): boolean {
  return environment.NODE_ENV === "production";
}

export function isDevelopment(environment: Environment = process.env): boolean {
  return environment.NODE_ENV === "development";
}

export function isIntegrationTest(environment: Environment = process.env): boolean {
  return environment.NODE_ENV === "test";
}

/** The port to listen on, which the process cannot start without. */
export function listenPort(environment: Environment = process.env): number {
  const rawPort = environment.PORT;

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

/** PORT as given, for the origins that may call this server locally. */
export function configuredPort(environment: Environment = process.env): string | undefined {
  return environment.PORT;
}

/**
 * The database to connect to. Integration tests get TEST_DATABASE_URL and
 * never DATABASE_URL, so they cannot mutate application data.
 */
export function databaseUrl(environment: Environment = process.env): string {
  const applicationDatabaseUrl = environment.DATABASE_URL;
  const testDatabaseUrl = environment.TEST_DATABASE_URL;

  if (isIntegrationTest(environment) && !testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL must be set for integration tests; refusing to use DATABASE_URL.",
    );
  }

  if (
    isIntegrationTest(environment) &&
    applicationDatabaseUrl &&
    testDatabaseUrl === applicationDatabaseUrl
  ) {
    throw new Error(
      "TEST_DATABASE_URL must be different from DATABASE_URL; integration tests cannot use an application database.",
    );
  }

  const url = isIntegrationTest(environment) ? testDatabaseUrl : applicationDatabaseUrl;

  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  return url;
}

export function logLevel(environment: Environment = process.env): string {
  return environment.LOG_LEVEL ?? "info";
}

export function clerkPublishableKey(environment: Environment = process.env): string | undefined {
  return environment.CLERK_PUBLISHABLE_KEY;
}

/** WEB_CLIENT_ROOT, trimmed; undefined when unset or blank. */
export function webClientRoot(environment: Environment = process.env): string | undefined {
  return environment.WEB_CLIENT_ROOT?.trim() || undefined;
}

/** PUBLIC_ORIGIN, trimmed; undefined when unset or blank. */
export function publicOrigin(environment: Environment = process.env): string | undefined {
  return environment.PUBLIC_ORIGIN?.trim() || undefined;
}

/**
 * The origins TRUSTED_ORIGINS and its CORS_ORIGINS alias list, split on commas
 * and whitespace. Not yet normalised.
 */
export function trustedOriginValues(environment: Environment = process.env): string[] {
  return [
    ...listValues(environment.TRUSTED_ORIGINS),
    ...listValues(environment.CORS_ORIGINS),
  ];
}

function listValues(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
