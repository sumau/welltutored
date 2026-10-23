import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "../core/db";
import { tutorProfileDraftsTable, tutorsTable } from "../models";
import { applyTutorDraft } from "../domain/tutor-drafts";
import { splitTutorName, tutorInitials } from "../domain/tutor-names";
import { publicTutorSlug, tutorSlugBase } from "../domain/tutor-slugs";
import {
  APPROVED_TUTOR_ACCENTS,
  normalizeTutorTint,
} from "../domain/tutor-accents";

export type Tutor = typeof tutorsTable.$inferSelect;
export type TutorProfileStatus = Tutor["profileStatus"];

/** The profile fields a Workspace edit writes, to a draft or to the published row. */
export type TutorProfileValues = Omit<
  typeof tutorProfileDraftsTable.$inferInsert,
  "id" | "tutorId" | "createdAt" | "updatedAt"
>;

export async function findPublishedTutor(slug: string) {
  const [directMatch] = await db
    .select()
    .from(tutorsTable)
    .where(
      and(
        eq(tutorsTable.slug, slug),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .limit(1);

  if (directMatch) return directMatch;

  const publishedTutors = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.profileStatus, "published"));

  return publishedTutors.find(
    (tutor) => publicTutorSlug(tutor.name) === slug,
  );
}

export function listPublishedTutors() {
  return db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.profileStatus, "published"))
    .orderBy(asc(tutorsTable.sortOrder));
}

export function listTutors() {
  return db
    .select()
    .from(tutorsTable)
    .orderBy(asc(tutorsTable.sortOrder));
}

export async function findTutor(id: number): Promise<Tutor | undefined> {
  const [tutor] = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.id, id))
    .limit(1);
  return tutor;
}

/** The name and accent a resource takes from its author. */
export async function findTutorAuthor(id: number) {
  const [tutor] = await db
    .select({ name: tutorsTable.name, tint: tutorsTable.tint })
    .from(tutorsTable)
    .where(eq(tutorsTable.id, id))
    .limit(1);
  return tutor;
}

export async function tutorExists(id: number): Promise<boolean> {
  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.id, id))
    .limit(1);
  return Boolean(tutor);
}

/** The name and status shown beside the Workspace account assigned to a tutor. */
export async function findTutorSummary(id: number) {
  const [tutor] = await db
    .select({
      name: tutorsTable.name,
      profileStatus: tutorsTable.profileStatus,
    })
    .from(tutorsTable)
    .where(eq(tutorsTable.id, id));
  return tutor;
}

async function countTutors(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(tutorsTable);
  return Number(value);
}

/** The approved accents no other tutor has, keeping this tutor's own. */
export async function availableTutorAccents(tutorId: number | null) {
  const tutors = await db
    .select({ id: tutorsTable.id, tint: tutorsTable.tint })
    .from(tutorsTable);
  const currentTint = tutorId == null
    ? null
    : tutors.find((tutor) => tutor.id === tutorId)?.tint;
  const usedByOthers = new Set(
    tutors
      .filter((tutor) => tutor.id !== tutorId)
      .map((tutor) => normalizeTutorTint(tutor.tint)),
  );

  return APPROVED_TUTOR_ACCENTS.filter(
    (accent) =>
      !usedByOthers.has(accent) ||
      (currentTint != null && normalizeTutorTint(currentTint) === accent),
  );
}

async function uniqueTutorSlug(name: string) {
  const base = tutorSlugBase(name);
  const tutors = await db
    .select({ name: tutorsTable.name, slug: tutorsTable.slug })
    .from(tutorsTable);
  const usedSlugs = new Set(
    tutors.flatMap((tutor) => [tutor.slug, tutorSlugBase(tutor.name)]),
  );

  let candidate = base;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * A blank draft profile for a new tutor, with a free accent and a unique
 * slug, or null when every approved accent is taken.
 */
export async function newDraftTutor(
  name: string,
): Promise<typeof tutorsTable.$inferInsert | null> {
  const [tint] = await availableTutorAccents(null);
  if (!tint) return null;

  const { firstName, lastName } = splitTutorName(name);
  return {
    name,
    firstName,
    lastName,
    initials: tutorInitials(name),
    subject: "",
    support: "",
    university: "",
    qualification: "",
    bio: "",
    profileSummary: "",
    teachingIntro: "",
    teachingPoints: [],
    rate: "0",
    availability: "",
    intake: "full",
    tint,
    profileStatus: "draft",
    slug: await uniqueTutorSlug(name),
    sortOrder: await countTutors(),
  };
}

/** Insert a tutor, inside a transaction when one is passed. */
export async function createTutor(
  values: typeof tutorsTable.$inferInsert,
  executor: Pick<typeof db, "insert"> = db,
): Promise<Tutor> {
  const [tutor] = await executor.insert(tutorsTable).values(values).returning();
  return tutor;
}

export async function setTutorProfileStatus(
  id: number,
  profileStatus: TutorProfileStatus,
): Promise<Tutor> {
  const [tutor] = await db
    .update(tutorsTable)
    .set({ profileStatus })
    .where(eq(tutorsTable.id, id))
    .returning();
  return tutor;
}

/** Delete a tutor, returning whether one was there to delete. */
export async function deleteTutor(id: number): Promise<boolean> {
  const [deleted] = await db
    .delete(tutorsTable)
    .where(eq(tutorsTable.id, id))
    .returning({ id: tutorsTable.id });
  return Boolean(deleted);
}

/** The accents of every tutor except this one. */
export function listOtherTutorTints(id: number) {
  return db
    .select({ id: tutorsTable.id, tint: tutorsTable.tint })
    .from(tutorsTable)
    .where(ne(tutorsTable.id, id));
}

export function listTutorDrafts() {
  return db.select().from(tutorProfileDraftsTable);
}

export async function findTutorDraft(tutorId: number) {
  const [draft] = await db
    .select()
    .from(tutorProfileDraftsTable)
    .where(eq(tutorProfileDraftsTable.tutorId, tutorId))
    .limit(1);
  return draft;
}

/** The tutor as the Workspace edits it, with any private draft applied. */
export async function findWorkspaceTutor(tutor: Tutor) {
  return applyTutorDraft(tutor, await findTutorDraft(tutor.id));
}

export async function saveTutorDraft(
  tutorId: number,
  profile: TutorProfileValues,
) {
  const [draft] = await db
    .insert(tutorProfileDraftsTable)
    .values({ tutorId, ...profile })
    .onConflictDoUpdate({
      target: tutorProfileDraftsTable.tutorId,
      set: profile,
    })
    .returning();
  return draft;
}

/** Publish the profile and drop its draft, together. */
export function publishTutorProfile(
  tutorId: number,
  profile: TutorProfileValues,
): Promise<Tutor> {
  return db.transaction(async (tx) => {
    const [published] = await tx
      .update(tutorsTable)
      .set({ ...profile, profileStatus: "published" })
      .where(eq(tutorsTable.id, tutorId))
      .returning();
    await tx
      .delete(tutorProfileDraftsTable)
      .where(eq(tutorProfileDraftsTable.tutorId, tutorId));
    return published;
  });
}

export async function deleteTutorDraft(tutorId: number): Promise<void> {
  await db
    .delete(tutorProfileDraftsTable)
    .where(eq(tutorProfileDraftsTable.tutorId, tutorId));
}
