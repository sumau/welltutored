const missingTestDatabaseMessage =
  "Test database unavailable: set TEST_DATABASE_URL to a dedicated PostgreSQL connection before running database-backed integration tests.";
const sharedTestDatabaseMessage =
  "Test database unsafe: TEST_DATABASE_URL must be different from DATABASE_URL; integration tests cannot use an application database.";

export function requireTestDatabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const testDatabaseUrl = environment.TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    throw new Error(missingTestDatabaseMessage);
  }

  const applicationDatabaseUrl = environment.DATABASE_URL?.trim();
  if (applicationDatabaseUrl && testDatabaseUrl === applicationDatabaseUrl) {
    throw new Error(sharedTestDatabaseMessage);
  }

  return testDatabaseUrl;
}
