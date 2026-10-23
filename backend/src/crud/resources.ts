import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../core/db";
import { resourcesTable, tutorsTable } from "../models";

export type Resource = typeof resourcesTable.$inferSelect;

/** A resource with the name and accent of the tutor who wrote it. */
const resourceWithAuthor = {
  resource: resourcesTable,
  tutor: {
    name: tutorsTable.name,
    tint: tutorsTable.tint,
  },
};

export function listPublishedResources() {
  return db
    .select(resourceWithAuthor)
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.status, "published"),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .orderBy(asc(resourcesTable.id));
}

export type ResourceSearch = {
  subject?: string;
  query?: string;
  page: number;
  pageSize: number;
};

/** One page of the public resources matching a search, and how many match in all. */
export async function searchPublishedResources({
  subject,
  query,
  page,
  pageSize,
}: ResourceSearch) {
  const filters = [
    eq(resourcesTable.status, "published"),
    eq(tutorsTable.profileStatus, "published"),
  ];
  if (subject) {
    filters.push(
      subject === "Science"
        ? inArray(resourcesTable.subject, ["Biology", "Physics", "Chemistry"])
        : eq(resourcesTable.subject, subject),
    );
  }
  if (query) {
    const search = `%${query}%`;
    filters.push(
      or(
        ilike(resourcesTable.title, search),
        ilike(resourcesTable.excerpt, search),
        ilike(tutorsTable.name, search),
      )!,
    );
  }

  const where = and(...filters);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(resourceWithAuthor)
      .from(resourcesTable)
      .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
      .where(where)
      .orderBy(asc(resourcesTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(resourcesTable)
      .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
      .where(where),
  ]);
  return { rows, total };
}

export async function findPublishedResource(slug: string) {
  const [row] = await db
    .select(resourceWithAuthor)
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.slug, slug),
        eq(resourcesTable.status, "published"),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .limit(1);
  return row;
}

/** Up to four public resources by the same tutor, the current one included. */
export function listRelatedResources(tutorId: number) {
  return db
    .select(resourceWithAuthor)
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.tutorId, tutorId),
        eq(resourcesTable.status, "published"),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .orderBy(asc(resourcesTable.id))
    .limit(4);
}

/**
 * A tutor's published resources, with the author's slug, name and accent.
 * The tutor's own profile status is not checked: the Workspace shows them
 * while the profile is a draft.
 */
export function listPublishedResourcesByTutor(tutorId: number) {
  return db
    .select({
      resource: resourcesTable,
      author: {
        slug: tutorsTable.slug,
        name: tutorsTable.name,
        tint: tutorsTable.tint,
      },
    })
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.tutorId, tutorId),
        eq(resourcesTable.status, "published"),
      ),
    );
}

export async function findResource(id: number) {
  const [row] = await db
    .select(resourceWithAuthor)
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(eq(resourcesTable.id, id))
    .limit(1);
  return row;
}

/** Every resource, or only one tutor's when a tutor id is given. */
export function listWorkspaceResources(tutorId: number | null) {
  return db
    .select(resourceWithAuthor)
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(tutorId ? eq(resourcesTable.tutorId, tutorId) : undefined)
    .orderBy(asc(resourcesTable.id));
}

export async function createResource(
  values: typeof resourcesTable.$inferInsert,
): Promise<Resource> {
  const [resource] = await db.insert(resourcesTable).values(values).returning();
  return resource;
}

export async function updateResource(
  id: number,
  values: Partial<typeof resourcesTable.$inferInsert>,
): Promise<Resource> {
  const [resource] = await db
    .update(resourcesTable)
    .set(values)
    .where(eq(resourcesTable.id, id))
    .returning();
  return resource;
}

export async function deleteResource(id: number): Promise<void> {
  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
}
