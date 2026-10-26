import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSmokeDeadline,
  expectStatus,
  parseJson,
  reportPassed,
  request,
  requireArray,
  requireInteger,
  requireNonEmptyString,
  requireRecord,
  resolveBaseUrl,
  resolveTimeoutMs,
  resolveTotalTimeoutMs,
  SmokeCheckError,
  type JsonRecord,
  type SmokeDeadline,
} from "./shared.js";

// The Public Site Smoke: the site is usable. It runs against the production
// image in the CI Smoke and against the Deployment in the Prod Smoke, with the
// same assertions on both.
// Named for the condition under which passing it is correct, not for what it
// skips: a stale one in CI should read as a bug.
const EMPTY_CONTENT_CHECK_FLAG = "--allow-empty";

type SmokeCheckModes = {
  allowsEmptyContent: boolean;
};

function expectResource(value: unknown, label: string): JsonRecord {
  const resource = requireRecord(value, label);
  requireInteger(resource.id, "id", label);
  requireNonEmptyString(resource.slug, "slug", label);
  requireNonEmptyString(resource.title, "title", label);
  requireNonEmptyString(resource.tutorSlug, "tutorSlug", label);
  requireNonEmptyString(resource.tutorName, "tutorName", label);
  requireNonEmptyString(resource.type, "type", label);
  requireInteger(resource.readMinutes, "readMinutes", label);
  requireNonEmptyString(resource.excerpt, "excerpt", label);
  requireNonEmptyString(resource.publishedAt, "publishedAt", label);
  if (Number.isNaN(Date.parse(resource.publishedAt as string))) {
    throw new SmokeCheckError(`${label}: expected a valid "publishedAt" date.`);
  }
  return resource;
}

function expectTutor(value: unknown, label: string): JsonRecord {
  const tutor = requireRecord(value, label);
  requireInteger(tutor.id, "id", label);
  requireNonEmptyString(tutor.slug, "slug", label);
  requireNonEmptyString(tutor.name, "name", label);
  requireNonEmptyString(tutor.subject, "subject", label);
  requireArray(tutor.resources, "resources", label);
  return tutor;
}

async function checkJson(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  expectedStatus: number,
  deadline: SmokeDeadline,
): Promise<unknown> {
  const data = await request(baseUrl, path, timeoutMs, undefined, deadline);
  expectStatus(data, expectedStatus, path);
  return parseJson(data, path);
}

async function checkPublicPage(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  deadline: SmokeDeadline,
) {
  const data = await request(
    baseUrl,
    path,
    timeoutMs,
    { headers: { Accept: "text/html" } },
    deadline,
  );
  expectStatus(data, 200, path);
  if (!data.contentType.toLowerCase().includes("text/html")) {
    throw new SmokeCheckError(
      `${path}: expected HTML content, received "${data.contentType || "none"}".`,
    );
  }
  if (!/<title>Well Tutored\b[^<]*<\/title>/i.test(data.body)) {
    throw new SmokeCheckError(
      `${path}: response did not contain the Well Tutored document.`,
    );
  }
}

async function runSmokeCheckSteps(
  baseUrl: URL,
  timeoutMs: number,
  deadline: SmokeDeadline,
  modes: SmokeCheckModes,
) {
  const passed: string[] = [];
  const skipped: string[] = [];

  const health = requireRecord(
    await checkJson(baseUrl, "/api/healthz", timeoutMs, 200, deadline),
    "/api/healthz",
  );
  if (health.status !== "ok") {
    throw new SmokeCheckError(`/api/healthz: expected {"status":"ok"}.`);
  }
  passed.push("/api/healthz");

  const tutors = requireArray(
    await checkJson(baseUrl, "/api/tutors", timeoutMs, 200, deadline),
    "/api/tutors",
    "/api/tutors",
  );
  if (tutors.length === 0) {
    if (!modes.allowsEmptyContent) {
      throw new SmokeCheckError(
        "/api/tutors: expected at least one published tutor.",
      );
    }
    skipped.push("/api/tutors has a published Tutor (deployment is empty)");
  }
  const parsedTutors = tutors.map((tutor, index) =>
    expectTutor(tutor, `/api/tutors[${index}]`),
  );
  for (const [index, tutor] of parsedTutors.entries()) {
    const resources = requireArray(
      tutor.resources,
      `/api/tutors[${index}].resources`,
      "tutor",
    );
    resources.forEach((resource, resourceIndex) =>
      expectResource(
        resource,
        `/api/tutors[${index}].resources[${resourceIndex}]`,
      ),
    );
  }
  passed.push("/api/tutors");

  const resourceCatalogue = await checkJson(
    baseUrl,
    "/api/resources",
    timeoutMs,
    200,
    deadline,
  );
  let resources: unknown[];
  if (Array.isArray(resourceCatalogue)) {
    // Tolerated for a Deployment still serving the pre-pagination list shape.
    resources = resourceCatalogue;
  } else {
    const catalogue = requireRecord(resourceCatalogue, "/api/resources");
    resources = requireArray(
      catalogue.items,
      "/api/resources.items",
      "/api/resources",
    );
    if (catalogue.page !== 1) {
      throw new SmokeCheckError("/api/resources: expected the first page.");
    }
    requireInteger(catalogue.pageSize, "pageSize", "/api/resources");
    requireInteger(catalogue.total, "total", "/api/resources");
    if (typeof catalogue.hasMore !== "boolean") {
      throw new SmokeCheckError('/api/resources: expected boolean "hasMore".');
    }
    if ((catalogue.total as number) < resources.length) {
      throw new SmokeCheckError(
        "/api/resources: total was smaller than items.length.",
      );
    }
  }
  // Resources are hidden from visitors (PUBLIC_RESOURCES_ENABLED in the web
  // app), so a usable Deployment needs none, and their pages are not checked.
  // Restore both when that switch turns on; see issue #61.
  resources.forEach((resource, index) =>
    expectResource(resource, `/api/resources[${index}]`),
  );
  passed.push("/api/resources");

  for (const path of ["/", "/enquire"]) {
    await checkPublicPage(baseUrl, path, timeoutMs, deadline);
    passed.push(path);
  }

  if (parsedTutors.length === 0) {
    skipped.push("/tutors/:slug (no published Tutor to address)");
  } else {
    const tutorSlug = parsedTutors[0].slug as string;
    const tutorPath = `/tutors/${encodeURIComponent(tutorSlug)}`;
    await checkPublicPage(baseUrl, tutorPath, timeoutMs, deadline);
    passed.push(tutorPath);
  }

  const invalidEnquiry = await request(
    baseUrl,
    "/api/enquiries",
    timeoutMs,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // Deliberately fails validation before tutor lookup or database insertion.
      body: JSON.stringify({}),
    },
    deadline,
  );
  expectStatus(invalidEnquiry, 400, "POST /api/enquiries (invalid payload)");
  const invalidEnquiryBody = requireRecord(
    parseJson(invalidEnquiry, "POST /api/enquiries (invalid payload)"),
    "POST /api/enquiries (invalid payload)",
  );
  requireNonEmptyString(
    invalidEnquiryBody.error,
    "error",
    "POST /api/enquiries (invalid payload)",
  );
  passed.push("POST /api/enquiries (invalid payload)");

  const recoveryHealth = requireRecord(
    await checkJson(baseUrl, "/api/healthz", timeoutMs, 200, deadline),
    "/api/healthz after invalid enquiry",
  );
  if (recoveryHealth.status !== "ok") {
    throw new SmokeCheckError(
      '/api/healthz after invalid enquiry: expected status "ok".',
    );
  }
  passed.push("/api/healthz after invalid enquiry");

  deadline.assertAvailable("public site smoke check completion");
  reportPassed("Public site", baseUrl, passed, skipped);
}

export async function runSmokeCheck() {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = resolveTimeoutMs();
  const totalTimeoutMs = resolveTotalTimeoutMs();
  const deadline = createSmokeDeadline(totalTimeoutMs);

  try {
    await runSmokeCheckSteps(baseUrl, timeoutMs, deadline, {
      allowsEmptyContent: process.argv.includes(EMPTY_CONTENT_CHECK_FLAG),
    });
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
    console.error(`Public site smoke check failed: ${message}`);
    return 1;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentFile = resolve(fileURLToPath(import.meta.url));

if (invokedFile === currentFile) {
  process.exitCode = await main();
}
