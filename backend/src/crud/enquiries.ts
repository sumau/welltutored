import { and, asc, eq } from "drizzle-orm";
import { db } from "../core/db";
import { enquiriesTable, tutorsTable } from "../models";
import type { WorkspaceAccount } from "./workspace-accounts";

/** The owner sees every enquiry, a tutor their own, an unassigned account none. */
function visibleTo(account: WorkspaceAccount) {
  return account.role === "owner"
    ? undefined
    : account.tutorId
      ? eq(enquiriesTable.tutorId, account.tutorId)
      : eq(enquiriesTable.tutorId, -1);
}

export async function createEnquiry(
  values: typeof enquiriesTable.$inferInsert,
) {
  const [enquiry] = await db
    .insert(enquiriesTable)
    .values(values)
    .returning({
      id: enquiriesTable.id,
      createdAt: enquiriesTable.createdAt,
    });
  return enquiry;
}

/** Mark an enquiry delivered, returning whether it still exists. */
export async function markEnquiryDelivered(id: number): Promise<boolean> {
  const [delivered] = await db
    .update(enquiriesTable)
    .set({ deliveryStatus: "delivered" })
    .where(eq(enquiriesTable.id, id))
    .returning({ id: enquiriesTable.id });
  return Boolean(delivered);
}

export async function markEnquiryFailed(id: number): Promise<void> {
  await db
    .update(enquiriesTable)
    .set({ deliveryStatus: "failed" })
    .where(eq(enquiriesTable.id, id));
}

export function listEnquiriesFor(account: WorkspaceAccount) {
  return db
    .select({
      enquiry: enquiriesTable,
      tutorName: tutorsTable.name,
    })
    .from(enquiriesTable)
    .innerJoin(tutorsTable, eq(enquiriesTable.tutorId, tutorsTable.id))
    .where(visibleTo(account))
    .orderBy(asc(enquiriesTable.createdAt), asc(enquiriesTable.id));
}

export async function findEnquiryFor(account: WorkspaceAccount, id: number) {
  const [row] = await db
    .select({
      enquiry: enquiriesTable,
      tutorName: tutorsTable.name,
    })
    .from(enquiriesTable)
    .innerJoin(tutorsTable, eq(enquiriesTable.tutorId, tutorsTable.id))
    .where(and(eq(enquiriesTable.id, id), visibleTo(account)))
    .limit(1);
  return row;
}
