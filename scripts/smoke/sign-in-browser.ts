import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { chromium, type Page } from "playwright-core";
import { resolveBaseUrl, resolveTimeoutMs } from "./smoke-check.js";

// The Sign-in Smoke: a real sign-in through the Clerk development instance,
// into the Workspace of a production image. Run by the Image Smoke job in CI.
const CHROMIUM_PATH_ENV_KEY = "SMOKE_CHROMIUM_PATH";
const EMAIL_ENV_KEY = "SMOKE_SIGN_IN_EMAIL";
const DATABASE_URL_ENV_KEY = "SMOKE_DATABASE_URL";
// Optional: where to save a screenshot of the page when the check fails.
const FAILURE_SCREENSHOT_ENV_KEY = "SMOKE_FAILURE_SCREENSHOT";
// Clerk's test mode accepts this code for any +clerk_test address, and sends
// no email: https://clerk.com/docs/testing/test-emails-and-phones
const TEST_EMAIL_CODE = "424242";
const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "db"]);

class SignInSmokeCheckError extends Error {}

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new SignInSmokeCheckError(`${key} is required.`);
  return value;
}

function resolveTestEmail(): string {
  const email = requiredEnv(EMAIL_ENV_KEY);
  if (!email.includes("+clerk_test@")) {
    throw new SignInSmokeCheckError(
      `${EMAIL_ENV_KEY} must be a +clerk_test address, which Clerk signs in ` +
        "with a fixed code and never emails.",
    );
  }
  return email;
}

// The check promotes an account to owner, so it only ever touches a local,
// throwaway database: never the Deployment's.
function resolveDatabaseUrl(): string {
  const value = requiredEnv(DATABASE_URL_ENV_KEY);
  const { hostname } = new URL(value);
  if (!LOCAL_DATABASE_HOSTS.has(hostname)) {
    throw new SignInSmokeCheckError(
      `${DATABASE_URL_ENV_KEY} must name a local database; received host "${hostname}".`,
    );
  }
  return value;
}

async function signIn(page: Page, baseUrl: URL, email: string, timeoutMs: number) {
  await page.goto(new URL("/sign-in", baseUrl).href);
  await page.locator("input[name=identifier]").fill(email, { timeout: timeoutMs });
  // The code field shows before Clerk has sent the code, and a code typed then
  // is rejected, so wait for the request that sends it.
  const codeSent = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/prepare_first_factor") && response.ok(),
    { timeout: timeoutMs },
  );
  codeSent.catch(() => {});
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const code = page.locator("input[autocomplete=one-time-code]").first();
  // An instance with passwords enabled may ask for one first; the test user
  // signs in with the email code instead.
  const useAnotherMethod = page.getByText("Use another method");
  const fieldError = page.locator(".cl-formFieldErrorText");
  await Promise.race([
    code.waitFor({ state: "visible", timeout: timeoutMs }),
    useAnotherMethod.waitFor({ state: "visible", timeout: timeoutMs }),
    fieldError.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);
  if (await fieldError.isVisible()) {
    throw new SignInSmokeCheckError(
      `Clerk rejected ${EMAIL_ENV_KEY}: "${await fieldError.innerText()}". ` +
        "The test user must exist in the instance the publishable key names.",
    );
  }
  if (!(await code.isVisible())) {
    await useAnotherMethod.click();
    await page.getByRole("button", { name: /Email code to/ }).click();
  }
  await codeSent;
  await code.click();
  await page.keyboard.type(TEST_EMAIL_CODE);
  await page.waitForURL((url) => url.pathname.startsWith("/workspace"), {
    timeout: timeoutMs,
  });
}

async function signOut(page: Page, timeoutMs: number) {
  await page.getByRole("button", { name: /^Sign out$/i }).first().click({ timeout: timeoutMs });
  await page.waitForURL((url) => !url.pathname.startsWith("/workspace"), {
    timeout: timeoutMs,
  });
}

// The guarded update from docs/first-deploy.md#owner, then a link to an
// unassigned published Tutor: a profile to edit, and a Resource needs one.
async function promoteToOwner(databaseUrl: string, email: string) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const promoted = await client.query(
      `UPDATE workspace_accounts
       SET role = 'owner', updated_at = NOW()
       WHERE lower(email) = lower($1)
         AND role = 'pending'
         AND NOT EXISTS (SELECT 1 FROM workspace_accounts WHERE role = 'owner')
       RETURNING id`,
      [email],
    );
    if (promoted.rowCount !== 1) {
      throw new SignInSmokeCheckError(
        "No pending account to promote: the first sign-in did not create one, " +
          "or the database already has an owner.",
      );
    }
    const linked = await client.query<{ slug: string }>(
      `UPDATE workspace_accounts
       SET tutor_id = t.id, updated_at = NOW()
       FROM (
         SELECT id, slug FROM tutors
         WHERE profile_status = 'published'
           AND id NOT IN (
             SELECT tutor_id FROM workspace_accounts WHERE tutor_id IS NOT NULL
           )
         ORDER BY id
         LIMIT 1
       ) t
       WHERE workspace_accounts.id = $1
       RETURNING t.slug`,
      [promoted.rows[0].id],
    );
    if (linked.rowCount !== 1) {
      throw new SignInSmokeCheckError("No unassigned published Tutor to link.");
    }
    return linked.rows[0].slug;
  } finally {
    await client.end();
  }
}

async function expectToast(page: Page, text: string, timeoutMs: number) {
  await page.getByText(text, { exact: true }).first().waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
}

async function editProfile(page: Page, baseUrl: URL, timeoutMs: number) {
  const availability = `Sign-in Smoke availability ${Date.now()}`;
  await page.goto(new URL("/workspace/profile", baseUrl).href);
  const field = page.getByLabel("Availability", { exact: true });
  await field.fill(availability, { timeout: timeoutMs });
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expectToast(page, "Profile draft saved successfully.", timeoutMs);

  await page.reload();
  const saved = page.getByLabel("Availability", { exact: true });
  await saved.waitFor({ state: "visible", timeout: timeoutMs });
  if ((await saved.inputValue()) !== availability) {
    throw new SignInSmokeCheckError("The saved profile edit did not survive a reload.");
  }
}

async function publishResource(page: Page, baseUrl: URL, timeoutMs: number) {
  await page.goto(new URL("/workspace/resources/new", baseUrl).href);
  await page.getByLabel("Title", { exact: true }).fill("Sign-in Smoke resource", { timeout: timeoutMs });
  await page.getByLabel("Subject", { exact: true }).fill("English");
  await page.getByLabel("Level", { exact: true }).fill("GCSE");
  await page.getByLabel("Excerpt", { exact: true }).fill("Written by the Sign-in Smoke in CI.");
  await page
    .getByLabel("Introduction", { exact: true })
    .fill("This Resource is published by the Sign-in Smoke and should stay hidden.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expectToast(page, "Resource created and published.", timeoutMs);

  const resources = await page.evaluate(async () => {
    const response = await fetch("/api/workspace/resources", { credentials: "include" });
    return (await response.json()) as Array<{ slug: string; status: string; title: string }>;
  });
  const resource = resources.find((r) => r.title === "Sign-in Smoke resource");
  if (resource?.status !== "published") {
    throw new SignInSmokeCheckError("The Workspace does not list the Resource as published.");
  }
  return resource.slug;
}

// PUBLIC_RESOURCES_ENABLED is false, so a published Resource's public page is
// Not Found. Invert this under #61.
async function expectResourceHidden(page: Page, baseUrl: URL, slug: string, timeoutMs: number) {
  await page.goto(new URL(`/resources/${slug}`, baseUrl).href);
  await page.getByText("404 Page Not Found").waitFor({ state: "visible", timeout: timeoutMs });
}

async function runSignInSmokeCheck() {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = resolveTimeoutMs();
  const executablePath = requiredEnv(CHROMIUM_PATH_ENV_KEY);
  const email = resolveTestEmail();
  const databaseUrl = resolveDatabaseUrl();

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  try {
    await signIn(page, baseUrl, email, timeoutMs);
    await page.getByText("Awaiting approval").waitFor({ state: "visible", timeout: timeoutMs });
    await signOut(page, timeoutMs);

    const tutorSlug = await promoteToOwner(databaseUrl, email);

    await signIn(page, baseUrl, email, timeoutMs);
    await page
      .getByText("Manage tutors and review content across the agency.")
      .waitFor({ state: "visible", timeout: timeoutMs });
    await editProfile(page, baseUrl, timeoutMs);
    const resourceSlug = await publishResource(page, baseUrl, timeoutMs);
    await expectResourceHidden(page, baseUrl, resourceSlug, timeoutMs);

    console.log(`Sign-in smoke check passed for ${baseUrl.origin}`);
    console.log("  ✓ first sign-in through Clerk shows Awaiting approval");
    console.log(`  ✓ promoted to owner, linked to ${tutorSlug}`);
    console.log("  ✓ second sign-in opens the owner's Workspace");
    console.log("  ✓ profile edit saves and survives a reload");
    console.log("  ✓ Resource publishes in the Workspace");
    console.log("  ✓ its public page stays Not Found while Resources are hidden");
  } catch (error) {
    const screenshotPath = process.env[FAILURE_SCREENSHOT_ENV_KEY]?.trim();
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      console.error(`Saved the page at ${page.url()} to ${screenshotPath}.`);
    }
    throw error;
  } finally {
    await browser.close();
  }
}

export async function main(): Promise<number> {
  try {
    await runSignInSmokeCheck();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Sign-in smoke check failed: ${message}`);
    return 1;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentFile = resolve(fileURLToPath(import.meta.url));

if (invokedFile === currentFile) {
  process.exitCode = await main();
}
