import type { tutorsTable } from "../../models";
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
