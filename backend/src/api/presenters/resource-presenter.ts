import type { resourcesTable, tutorsTable } from "../../models";
import { estimateReadMinutes } from "../../domain/text";
import { normalizeResourceType } from "../../domain/resource-types";
import { normalizeTutorTint } from "../../domain/tutor-accents";
import { publicTutorSlug } from "../../domain/tutor-slugs";

export function toResourceResponse(
  resource: typeof resourcesTable.$inferSelect,
  tutor: Pick<typeof tutorsTable.$inferSelect, "name" | "tint">,
) {
  return {
    id: resource.id,
    slug: resource.slug,
    tutorId: resource.tutorId,
    tutorName: tutor.name,
    title: resource.title,
    subject: resource.subject,
    level: resource.level,
    type: normalizeResourceType(resource.type),
    readMinutes: estimateReadMinutes(resource.body, resource.sections),
    excerpt: resource.excerpt,
    body: resource.body,
    sections: resource.sections,
    publishedAt: resource.publishedAt,
    tint: normalizeTutorTint(tutor.tint),
    status: resource.status,
  };
}

/** A published resource as a tutor profile or resource list shows it. */
export function toResourceSummary(
  resource: typeof resourcesTable.$inferSelect,
  tutor: Pick<typeof tutorsTable.$inferSelect, "name" | "tint">,
  tutorSlug = publicTutorSlug(tutor.name),
) {
  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    tutorSlug,
    tutorName: tutor.name,
    tutorTint: normalizeTutorTint(tutor.tint),
    subject: resource.subject,
    level: resource.level,
    type: normalizeResourceType(resource.type),
    readMinutes: estimateReadMinutes(resource.body, resource.sections),
    excerpt: resource.excerpt,
    publishedAt: resource.publishedAt,
    tint: normalizeTutorTint(tutor.tint),
  };
}
