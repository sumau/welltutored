import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "../core/db";
import { tutorProfileDraftsTable, tutorsTable } from "../models";
import { applyTutorDraft } from "../domain/tutor-drafts";
import { publicTutorSlug } from "../domain/tutor-slugs";

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

export async function countTutors(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(tutorsTable);
  return Number(value);
}

export async function createTutor(
  values: typeof tutorsTable.$inferInsert,
): Promise<Tutor> {
  const [tutor] = await db.insert(tutorsTable).values(values).returning();
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
