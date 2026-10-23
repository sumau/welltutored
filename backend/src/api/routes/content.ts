import { Router, type IRouter } from "express";
import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import {
  GetResourceParams,
  GetResourceResponse,
  GetTutorParams,
  GetTutorResponse,
  ListResourcesQueryParams,
  ListResourcesResponse,
  ListTutorsResponse,
} from "../schemas";
import { db } from "../../core/db";
import { resourcesTable, tutorsTable } from "../../models";
import { estimateReadMinutes, truncateAtWordBoundary } from "../../domain/text";
import { tutorNameFields } from "../../domain/tutor-names";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import { normalizeTutorTint } from "../../domain/tutor-accents";
import { normalizeResourceType } from "../../domain/resource-types";
import { findPublishedTutor, listPublishedTutors } from "../../crud/tutors";
import { setPublicTutorCacheHeaders } from "../public-cache";

const router: IRouter = Router();

type ResourceJoined = {
  resource: typeof resourcesTable.$inferSelect;
  tutor: Pick<typeof tutorsTable.$inferSelect, "name" | "tint">;
};

function toResource(row: ResourceJoined) {
  return {
    id: row.resource.id,
    slug: row.resource.slug,
    title: row.resource.title,
    tutorSlug: publicTutorSlug(row.tutor.name),
    tutorName: row.tutor.name,
    tutorTint: normalizeTutorTint(row.tutor.tint),
    subject: row.resource.subject,
    level: row.resource.level,
    type: normalizeResourceType(row.resource.type),
    readMinutes: estimateReadMinutes(row.resource.body, row.resource.sections),
    excerpt: row.resource.excerpt,
    publishedAt: row.resource.publishedAt,
    tint: normalizeTutorTint(row.tutor.tint),
  };
}

async function listJoinedResources() {
  return db
    .select({
      resource: resourcesTable,
      tutor: {
        name: tutorsTable.name,
        tint: tutorsTable.tint,
      },
    })
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

router.get("/tutors", async (_req, res): Promise<void> => {
  const [tutors, resources] = await Promise.all([
    listPublishedTutors(),
    listJoinedResources(),
  ]);

  const payload = tutors.map((tutor) => ({
    id: tutor.id,
    slug: publicTutorSlug(tutor.name),
    ...tutorNameFields(tutor),
    initials: tutor.initials,
    subject: tutor.subject,
    support: tutor.support,
    profileSummary: tutor.profileSummary,
    university: tutor.university,
    qualification: tutor.qualification,
    bio: tutor.bio,
    experience: tutor.experience,
    education: tutor.education,
    teachingIntro: truncateAtWordBoundary(tutor.teachingIntro, 200),
    teachingPoints: tutor.teachingPoints,
    rate: Number(tutor.rate),
    availability: tutor.availability,
    intake: tutor.intake,
    tint: normalizeTutorTint(tutor.tint),
    resources: resources
      .filter((row) => row.resource.tutorId === tutor.id)
      .map(toResource),
  }));

  setPublicTutorCacheHeaders(res);
  res.json(ListTutorsResponse.parse(payload));
});

router.get("/tutors/:slug", async (req, res): Promise<void> => {
  const params = GetTutorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tutor = await findPublishedTutor(params.data.slug);

  if (!tutor) {
    res.status(404).json({ error: "Tutor not found" });
    return;
  }

  const resources = await listJoinedResources();
  setPublicTutorCacheHeaders(res);
  res.json(
    GetTutorResponse.parse({
      id: tutor.id,
      slug: publicTutorSlug(tutor.name),
      ...tutorNameFields(tutor),
      initials: tutor.initials,
      subject: tutor.subject,
      support: tutor.support,
      profileSummary: tutor.profileSummary,
      university: tutor.university,
      qualification: tutor.qualification,
      bio: tutor.bio,
      experience: tutor.experience,
      education: tutor.education,
      teachingIntro: truncateAtWordBoundary(tutor.teachingIntro, 200),
      teachingPoints: tutor.teachingPoints,
      rate: Number(tutor.rate),
      availability: tutor.availability,
      intake: tutor.intake,
       tint: normalizeTutorTint(tutor.tint),
      resources: resources
        .filter((row) => row.resource.tutorId === tutor.id)
        .map(toResource),
    }),
  );
});

router.get("/resources", async (req, res): Promise<void> => {
  const params = ListResourcesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const filters = [
    eq(resourcesTable.status, "published"),
    eq(tutorsTable.profileStatus, "published"),
  ];
  if (params.data.subject) {
    filters.push(
      params.data.subject === "Science"
        ? inArray(resourcesTable.subject, ["Biology", "Physics", "Chemistry"])
        : eq(resourcesTable.subject, params.data.subject),
    );
  }
  if (params.data.query) {
    const search = `%${params.data.query}%`;
    filters.push(
      or(
        ilike(resourcesTable.title, search),
        ilike(resourcesTable.excerpt, search),
        ilike(tutorsTable.name, search),
      )!,
    );
  }

  const page = params.data.page ?? 1;
  const pageSize = params.data.pageSize ?? 9;
  const where = and(...filters);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        resource: resourcesTable,
        tutor: {
          name: tutorsTable.name,
          tint: tutorsTable.tint,
        },
      })
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

  res.json(
    ListResourcesResponse.parse({
      items: rows.map(toResource),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }),
  );
});

router.get("/resources/:slug", async (req, res): Promise<void> => {
  const params = GetResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      resource: resourcesTable,
      tutor: {
        name: tutorsTable.name,
        tint: tutorsTable.tint,
      },
    })
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.slug, params.data.slug),
        eq(resourcesTable.status, "published"),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  const relatedRows = await db
    .select({
      resource: resourcesTable,
      tutor: {
        name: tutorsTable.name,
        tint: tutorsTable.tint,
      },
    })
    .from(resourcesTable)
    .innerJoin(tutorsTable, eq(resourcesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(resourcesTable.tutorId, row.resource.tutorId),
        eq(resourcesTable.status, "published"),
        eq(tutorsTable.profileStatus, "published"),
      ),
    )
    .orderBy(asc(resourcesTable.id))
    .limit(4);

  res.json(
    GetResourceResponse.parse({
      ...toResource(row),
      body: row.resource.body,
      sections: row.resource.sections,
      related: relatedRows
        .filter((item) => item.resource.id !== row.resource.id)
        .slice(0, 3)
        .map(toResource),
    }),
  );
});

export default router;