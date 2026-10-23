import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import http from "node:http";
import test, { after, before } from "node:test";
import express from "express";
import { inArray } from "drizzle-orm";
import { db, pool } from "../../../src/core/db";
import { resourcesTable, tutorsTable } from "../../../src/models";
import contentRouter from "../../../src/api/routes/content";

// Every resource here has the run id in its title, excerpt or tutor name, so
// searching for it keeps other test files' resources out of the results.
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const tutorName = `Resources Tutor ${runId}`;
const draftTutorName = `Resources Draft Tutor ${runId}`;
const tutorNames = [tutorName, draftTutorName];
const tint = `#${runId.slice(0, 6)}`;

let server: http.Server;
let baseUrl: string;

async function get<T = any>(path: string): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: (await response.json()) as T };
}

function listSlugs(query: Record<string, string>) {
  const search = new URLSearchParams(query);
  return get<{ items: { slug: string }[]; total: number; hasMore: boolean; page: number; pageSize: number }>(
    `/api/resources?${search}`,
  );
}

function slug(name: string) {
  return `resources-${name}-${runId}`;
}

function resourceRow(
  tutorId: number,
  name: string,
  overrides: Partial<typeof resourcesTable.$inferInsert> = {},
): typeof resourcesTable.$inferInsert {
  return {
    slug: slug(name),
    tutorId,
    title: `Resource ${name} ${runId}`,
    subject: "History",
    level: "GCSE",
    type: "Guide",
    readMinutes: 1,
    excerpt: `An excerpt about ${name}.`,
    body: "A short body for this isolated resources run.",
    publishedAt: "2026-01-01",
    tint,
    status: "published",
    ...overrides,
  };
}

async function cleanUp() {
  await db.delete(tutorsTable).where(inArray(tutorsTable.name, tutorNames));
}

before(async () => {
  server = express().use("/api", contentRouter).listen(0);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;

  await cleanUp();
  const tutorDefaults = {
    initials: "RT",
    subject: "History",
    university: "University of Bristol",
    qualification: "First-class BA (Hons), History",
    bio: "A history tutor for this isolated resources run.",
    teachingPoints: [
      { title: "Clarity", body: "We make difficult sources easier to understand." },
    ],
    rate: "40",
    availability: "Weekday evenings after 4pm",
  };
  const [tutor, draftTutor] = await db
    .insert(tutorsTable)
    .values([
      { ...tutorDefaults, slug: `resources-tutor-${runId}`, name: tutorName, profileStatus: "published", tint },
      { ...tutorDefaults, slug: `resources-draft-tutor-${runId}`, name: draftTutorName, profileStatus: "draft", tint: `#${runId.slice(6, 12)}` },
    ])
    .returning({ id: tutorsTable.id });

  await db.insert(resourcesTable).values([
    resourceRow(tutor.id, "history"),
    resourceRow(tutor.id, "biology", { subject: "Biology" }),
    resourceRow(tutor.id, "physics", { subject: "Physics" }),
    resourceRow(tutor.id, "chemistry", { subject: "Chemistry" }),
    resourceRow(tutor.id, "english", {
      subject: "English",
      title: "Reading unseen poetry",
      excerpt: `Find the turn in a poem, run ${runId}.`,
    }),
    resourceRow(tutor.id, "draft", { status: "draft" }),
    resourceRow(draftTutor.id, "hidden-tutor"),
  ]);
});

after(async () => {
  await cleanUp();
  server.close();
  await once(server, "close");
  await pool.end();
});

test("the resource list shows only published resources by published tutors", async () => {
  const { response, body } = await listSlugs({ query: runId });

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.items.map((item) => item.slug),
    ["history", "biology", "physics", "chemistry", "english"].map(slug),
  );
  assert.equal(body.total, 5);
  assert.equal(body.hasMore, false);
});

test("search matches the title, the excerpt or the tutor's name", async () => {
  const byTitle = await listSlugs({ query: `Resource physics ${runId}` });
  assert.deepEqual(byTitle.body.items.map((item) => item.slug), [slug("physics")]);

  const byExcerpt = await listSlugs({ query: `turn in a poem, run ${runId}` });
  assert.deepEqual(byExcerpt.body.items.map((item) => item.slug), [slug("english")]);

  const byTutor = await listSlugs({ query: tutorName.toUpperCase() });
  assert.equal(byTutor.body.total, 5);

  const noMatch = await listSlugs({ query: `nothing matches ${runId}` });
  assert.deepEqual(noMatch.body, { items: [], page: 1, pageSize: 9, total: 0, hasMore: false });
});

test("the subject filter matches exactly, and Science covers the three sciences", async () => {
  const history = await listSlugs({ query: runId, subject: "History" });
  assert.deepEqual(history.body.items.map((item) => item.slug), [slug("history")]);

  const science = await listSlugs({ query: runId, subject: "Science" });
  assert.deepEqual(
    science.body.items.map((item) => item.slug),
    ["biology", "physics", "chemistry"].map(slug),
  );
});

test("the resource list pages through results", async () => {
  const first = await listSlugs({ query: runId, pageSize: "2" });
  assert.deepEqual(first.body.items.map((item) => item.slug), ["history", "biology"].map(slug));
  assert.equal(first.body.total, 5);
  assert.equal(first.body.hasMore, true);

  const last = await listSlugs({ query: runId, pageSize: "2", page: "3" });
  assert.deepEqual(last.body.items.map((item) => item.slug), [slug("english")]);
  assert.equal(last.body.page, 3);
  assert.equal(last.body.hasMore, false);

  const invalid = await listSlugs({ query: runId, page: "0" });
  assert.equal(invalid.response.status, 400);
});

test("a published resource opens with its body and related resources", async () => {
  const { response, body } = await get(`/api/resources/${slug("history")}`);

  assert.equal(response.status, 200);
  assert.equal(body.slug, slug("history"));
  assert.equal(body.title, `Resource history ${runId}`);
  assert.equal(body.tutorName, tutorName);
  assert.equal(body.body, "A short body for this isolated resources run.");
  assert.deepEqual(
    body.related.map((item: { slug: string }) => item.slug),
    ["biology", "physics", "chemistry"].map(slug),
  );
});

test("a draft resource, or one by an unpublished tutor, does not open", async () => {
  for (const name of ["draft", "hidden-tutor", "missing"]) {
    const { response, body } = await get(`/api/resources/${slug(name)}`);
    assert.equal(response.status, 404, name);
    assert.equal(body.error, "Resource not found");
  }
});
