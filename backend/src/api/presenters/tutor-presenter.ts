import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { tutorProfileDraftsTable, tutorsTable } from "../../models";
import { truncateAtWordBoundary } from "../../domain/text";
import { tutorNameFields } from "../../domain/tutor-names";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import { normalizeTutorTint } from "../../domain/tutor-accents";

export function toTutorResponse(
  tutor: typeof tutorsTable.$inferSelect,
  resources: unknown[] = [],
  slug = publicTutorSlug(tutor.name),
) {
  return {
    ...tutor,
    ...tutorNameFields(tutor),
    tint: normalizeTutorTint(tutor.tint),
    teachingIntro: truncateAtWordBoundary(tutor.teachingIntro, 200),
    slug,
    rate: Number(tutor.rate),
    resources,
  };
}

export function applyTutorDraft(
  tutor: typeof tutorsTable.$inferSelect,
  draft: typeof tutorProfileDraftsTable.$inferSelect | undefined,
) {
  if (!draft) return tutor;
  return {
    ...tutor,
    name: draft.name,
    firstName: draft.firstName,
    lastName: draft.lastName,
    initials: draft.initials,
    subject: draft.subject,
    support: draft.support,
    profileSummary: draft.profileSummary,
    university: draft.university,
    qualification: draft.qualification,
    bio: draft.bio,
    experience: draft.experience,
    education: draft.education,
    teachingIntro: draft.teachingIntro,
    teachingPoints: draft.teachingPoints,
    rate: draft.rate,
    availability: draft.availability,
    intake: draft.intake,
    tint: draft.tint,
    profileStatus:
      tutor.profileStatus === "archived" ? ("archived" as const) : ("draft" as const),
  };
}

export async function findWorkspaceTutor(
  tutor: typeof tutorsTable.$inferSelect,
) {
  const [draft] = await db
    .select()
    .from(tutorProfileDraftsTable)
    .where(eq(tutorProfileDraftsTable.tutorId, tutor.id))
    .limit(1);
  return applyTutorDraft(tutor, draft);
}