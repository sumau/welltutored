import type { tutorProfileDraftsTable, tutorsTable } from "../models";

/** The tutor as the Workspace edits it: the private draft over the published profile. */
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
