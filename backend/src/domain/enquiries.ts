import type { tutorsTable } from "../models";

export function canReceivePublicEnquiries(
  tutor: Pick<typeof tutorsTable.$inferSelect, "intake">,
) {
  return tutor.intake !== "full";
}
