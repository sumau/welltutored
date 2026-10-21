import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import http from "node:http";
import test, { after, before } from "node:test";
import express from "express";
import { eq, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  db,
  enquiriesTable,
  pool,
  tutorsTable,
  workspaceAccountsTable,
} from "@workspace/db";
import enquiriesRouter from "./enquiries";

const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const ownerUserId = `enquiries-owner-${runId}`;
const tutorUserId = `enquiries-tutor-${runId}`;
const pendingUserId = `enquiries-pending-${runId}`;
const clerkEmailByUserId = new Map<string, string>([
  [ownerUserId, `enquiries-owner-${runId}@example.test`],
  [tutorUserId, `enquiries-tutor-${runId}@example.test`],
  [pendingUserId, `enquiries-pending-${runId}@example.test`],
]);
const tutorSlug = `enquiries-tutor-${runId}`;
const tutorName = `Enquiries Tutor ${runId}`;
const otherTutorSlug = `enquiries-other-tutor-${runId}`;
const otherTutorName = `Enquiries Other Tutor ${runId}`;
const fullTutorSlug = `enquiries-full-tutor-${runId}`;
const fullTutorName = `Enquiries Full Tutor ${runId}`;
const draftTutorSlug = `enquiries-draft-tutor-${runId}`;
const draftTutorName = `Enquiries Draft Tutor ${runId}`;
const tutorNames = [tutorName, otherTutorName, fullTutorName, draftTutorName];
const clerkUsersPrototype = Object.getPrototypeOf(clerkClient.users) as {
  getUser: typeof clerkClient.users.getUser;
};
const originalGetUser = clerkUsersPrototype.getUser;

let server: http.Server;
let baseUrl: string;
let tutorId: number;
let otherTutorId: number;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const header = req.headers["x-test-user"];
    const userId = typeof header === "string" ? header : null;
    const auth = Object.assign(
      () => ({
        userId,
        sessionId: userId ? "enquiries-session" : null,
        tokenType: "session_token",
      }),
      { [Symbol.for("@clerk/express.auth")]: true },
    );

    Object.assign(req, { auth, log: { info() {}, error() {} } });
    next();
  });
  app.use("/api", enquiriesRouter);
  return app;
}

async function request<T = any>(
  path: string,
  init: RequestInit = {},
  userId?: string,
): Promise<{ response: Response; body: T }> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (userId) headers.set("x-test-user", userId);

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = (await response.json()) as T;
  return { response, body };
}

function enquiryInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Parent Enquirer",
    email: `parent-${runId}@example.test`,
    tutorSlug,
    studentName: "Student",
    studentAge: "15",
    subjectLevel: "GCSE History",
    message: `Looking for weekly GCSE history support, run ${runId}.`,
    ...overrides,
  };
}

function submitEnquiry(overrides: Record<string, unknown> = {}) {
  return request("/api/enquiries", {
    method: "POST",
    body: JSON.stringify(enquiryInput(overrides)),
  });
}

async function storedEnquiry(id: number) {
  const [row] = await db
    .select()
    .from(enquiriesTable)
    .where(eq(enquiriesTable.id, id));
  return row;
}

// Delivery is a database update, so failing the next `failures` updates
// stands in for a delivery outage.
async function withFailingUpdates<T>(failures: number, run: () => Promise<T>) {
  const originalUpdate = db.update;
  let remaining = failures;
  db.update = ((...args: Parameters<typeof db.update>) => {
    if (remaining > 0) {
      remaining -= 1;
      throw new Error("Simulated delivery outage");
    }
    return originalUpdate.apply(db, args);
  }) as typeof db.update;
  try {
    return await run();
  } finally {
    db.update = originalUpdate;
  }
}

// Tutor tints are unique, so each tutor takes a different slice of the run id.
function tutorRow(
  index: number,
  slug: string,
  name: string,
  overrides: Partial<typeof tutorsTable.$inferInsert> = {},
): typeof tutorsTable.$inferInsert {
  return {
    slug,
    profileStatus: "published",
    name,
    initials: "ET",
    subject: "History",
    university: "University of Bristol",
    qualification: "First-class BA (Hons), History",
    bio: "A history tutor for this isolated enquiries run.",
    teachingPoints: [
      { title: "Clarity", body: "We make difficult sources easier to understand." },
    ],
    rate: "40",
    availability: "Weekday evenings after 4pm",
    intake: "accepting",
    tint: `#${runId.slice(index, index + 6)}`,
    ...overrides,
  };
}

async function cleanUp() {
  const tutorIds = db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(inArray(tutorsTable.name, tutorNames));
  await db.delete(enquiriesTable).where(inArray(enquiriesTable.tutorId, tutorIds));
  await db
    .delete(workspaceAccountsTable)
    .where(inArray(workspaceAccountsTable.clerkUserId, [...clerkEmailByUserId.keys()]));
  await db.delete(tutorsTable).where(inArray(tutorsTable.name, tutorNames));
}

before(async () => {
  clerkUsersPrototype.getUser = (async (userId: string) => {
    const email = clerkEmailByUserId.get(userId) ?? `${userId}@example.test`;
    const emailAddressId = `${userId}-primary-email`;
    return {
      id: userId,
      primaryEmailAddressId: emailAddressId,
      emailAddresses: [
        {
          id: emailAddressId,
          emailAddress: email,
          verification: { status: "verified" },
        },
      ],
    } as Awaited<ReturnType<typeof originalGetUser>>;
  }) as typeof originalGetUser;

  server = createTestApp().listen(0);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;

  await cleanUp();
  const tutors = await db
    .insert(tutorsTable)
    .values([
      tutorRow(0, tutorSlug, tutorName),
      tutorRow(1, otherTutorSlug, otherTutorName),
      tutorRow(2, fullTutorSlug, fullTutorName, { intake: "full" }),
      tutorRow(3, draftTutorSlug, draftTutorName, { profileStatus: "draft" }),
    ])
    .returning({ id: tutorsTable.id, slug: tutorsTable.slug });
  tutorId = tutors.find((tutor) => tutor.slug === tutorSlug)!.id;
  otherTutorId = tutors.find((tutor) => tutor.slug === otherTutorSlug)!.id;

  await db.insert(workspaceAccountsTable).values([
    {
      clerkUserId: ownerUserId,
      email: clerkEmailByUserId.get(ownerUserId)!,
      displayName: "Enquiries Owner",
      role: "owner",
    },
    {
      clerkUserId: tutorUserId,
      email: clerkEmailByUserId.get(tutorUserId)!,
      displayName: tutorName,
      role: "tutor",
      tutorId,
    },
    {
      clerkUserId: pendingUserId,
      email: clerkEmailByUserId.get(pendingUserId)!,
      displayName: "Enquiries Pending",
      role: "pending",
    },
  ]);
});

after(async () => {
  clerkUsersPrototype.getUser = originalGetUser;
  await cleanUp();
  server.close();
  await once(server, "close");
  await pool.end();
});

test("a valid enquiry is saved and delivered", async () => {
  const { response, body } = await submitEnquiry();

  assert.equal(response.status, 201);
  assert.equal(body.tutorName, tutorName);
  assert.equal(body.deliveryStatus, "delivered");
  assert.equal(body.message, "Your enquiry has been delivered to the Well Tutored team.");

  const row = await storedEnquiry(body.id);
  assert.equal(row.tutorId, tutorId);
  assert.equal(row.name, "Parent Enquirer");
  assert.equal(row.email, `parent-${runId}@example.test`);
  assert.equal(row.studentName, "Student");
  assert.equal(row.studentAge, "15");
  assert.equal(row.subjectLevel, "GCSE History");
  assert.equal(row.message, enquiryInput().message);
  assert.equal(row.deliveryStatus, "delivered");
  assert.equal(new Date(body.receivedAt).getTime(), row.createdAt.getTime());
});

test("an enquiry whose delivery fails is kept and marked failed", async () => {
  const { response, body } = await withFailingUpdates(1, () => submitEnquiry());

  assert.equal(response.status, 201);
  assert.equal(body.deliveryStatus, "failed");
  assert.match(body.message, /You do not need to submit it again/);
  assert.equal((await storedEnquiry(body.id)).deliveryStatus, "failed");
});

test("an enquiry stays pending when even the failure can't be recorded", async () => {
  const { response, body } = await withFailingUpdates(2, () => submitEnquiry());

  assert.equal(response.status, 201);
  assert.equal(body.deliveryStatus, "pending");
  assert.match(body.message, /waiting for staff delivery/);
  assert.equal((await storedEnquiry(body.id)).deliveryStatus, "pending");
});

test("an invalid enquiry is rejected and nothing is saved", async () => {
  const rejected = [
    await submitEnquiry({ email: "not-an-email" }),
    await submitEnquiry({ studentName: "" }),
    await submitEnquiry({ tutorSlug: `no-such-tutor-${runId}` }),
    await submitEnquiry({ tutorSlug: fullTutorSlug }),
    await submitEnquiry({ tutorSlug: draftTutorSlug }),
  ];

  assert.deepEqual(
    rejected.map(({ response, body }) => [response.status, body.error]),
    [
      [400, "Please check the enquiry details."],
      [400, "Please check the enquiry details."],
      [400, "Please select an available tutor."],
      [400, "Please select an available tutor."],
      [400, "Please select an available tutor."],
    ],
  );

  const [{ id: fullTutorId }] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.slug, fullTutorSlug));
  const [{ id: draftTutorId }] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.slug, draftTutorSlug));
  const saved = await db
    .select({ id: enquiriesTable.id })
    .from(enquiriesTable)
    .where(inArray(enquiriesTable.tutorId, [fullTutorId, draftTutorId]));
  assert.deepEqual(saved, []);
});

test("the workspace lists enquiries only to the people who may see them", async () => {
  const own = (await submitEnquiry()).body;
  const other = (await submitEnquiry({ tutorSlug: otherTutorSlug })).body;

  const asOwner = await request<any[]>("/api/workspace/enquiries", {}, ownerUserId);
  assert.equal(asOwner.response.status, 200);
  const ownerIds = asOwner.body.map((enquiry) => enquiry.id);
  assert(ownerIds.includes(own.id));
  assert(ownerIds.includes(other.id));

  const asTutor = await request<any[]>("/api/workspace/enquiries", {}, tutorUserId);
  assert.equal(asTutor.response.status, 200);
  assert(asTutor.body.every((enquiry) => enquiry.tutorId === tutorId));
  const listed = asTutor.body.find((enquiry) => enquiry.id === own.id);
  assert.deepEqual(listed, {
    id: own.id,
    tutorId,
    tutorName,
    name: "Parent Enquirer",
    email: `parent-${runId}@example.test`,
    studentName: "Student",
    studentAge: "15",
    subjectLevel: "GCSE History",
    message: enquiryInput().message,
    deliveryStatus: "delivered",
    createdAt: own.receivedAt,
  });
  assert(!asTutor.body.some((enquiry) => enquiry.id === other.id));

  const asPending = await request("/api/workspace/enquiries", {}, pendingUserId);
  assert.equal(asPending.response.status, 403);

  const signedOut = await request("/api/workspace/enquiries");
  assert.equal(signedOut.response.status, 401);
});

test("retrying a failed enquiry delivers it", async () => {
  const failed = (await withFailingUpdates(1, () => submitEnquiry())).body;
  assert.equal(failed.deliveryStatus, "failed");

  const retried = await request(
    `/api/workspace/enquiries/${failed.id}/retry`,
    { method: "POST" },
    tutorUserId,
  );

  assert.equal(retried.response.status, 200);
  assert.equal(retried.body.id, failed.id);
  assert.equal(retried.body.tutorName, tutorName);
  assert.equal(retried.body.deliveryStatus, "delivered");
  assert.equal((await storedEnquiry(failed.id)).deliveryStatus, "delivered");
});

test("a retry that fails again leaves the enquiry failed", async () => {
  const failed = (await withFailingUpdates(1, () => submitEnquiry())).body;

  const retried = await withFailingUpdates(1, () =>
    request(`/api/workspace/enquiries/${failed.id}/retry`, { method: "POST" }, ownerUserId),
  );

  assert.equal(retried.response.status, 503);
  assert.equal(retried.body.error, "Delivery is still unavailable. Please try again later.");
  assert.equal((await storedEnquiry(failed.id)).deliveryStatus, "failed");
});

test("a retry is refused for another tutor's enquiry, a bad id, or a pending account", async () => {
  const other = (await withFailingUpdates(1, () => submitEnquiry({ tutorSlug: otherTutorSlug }))).body;
  assert.equal((await storedEnquiry(other.id)).tutorId, otherTutorId);

  const asTutor = await request(
    `/api/workspace/enquiries/${other.id}/retry`,
    { method: "POST" },
    tutorUserId,
  );
  assert.equal(asTutor.response.status, 404);

  const badId = await request(
    "/api/workspace/enquiries/not-a-number/retry",
    { method: "POST" },
    ownerUserId,
  );
  assert.equal(badId.response.status, 400);

  const asPending = await request(
    `/api/workspace/enquiries/${other.id}/retry`,
    { method: "POST" },
    pendingUserId,
  );
  assert.equal(asPending.response.status, 403);

  assert.equal((await storedEnquiry(other.id)).deliveryStatus, "failed");
});
