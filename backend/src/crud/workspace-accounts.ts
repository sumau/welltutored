import { clerkClient } from "@clerk/express";
import { and, asc, eq, ilike, ne } from "drizzle-orm";
import { db } from "../core/db";
import { tutorsTable, workspaceAccountsTable } from "../models";
import { splitTutorName } from "../domain/tutor-names";
import { createTutor, newDraftTutor } from "./tutors";

export type WorkspaceAccount = typeof workspaceAccountsTable.$inferSelect;

/** Every Workspace account, with the name and status of its tutor profile. */
export function listWorkspaceAccounts() {
  return db
    .select({
      account: workspaceAccountsTable,
      tutorName: tutorsTable.name,
      tutorProfileStatus: tutorsTable.profileStatus,
    })
    .from(workspaceAccountsTable)
    .leftJoin(tutorsTable, eq(workspaceAccountsTable.tutorId, tutorsTable.id))
    .orderBy(asc(workspaceAccountsTable.id));
}

export async function findWorkspaceAccount(
  id: number,
): Promise<WorkspaceAccount | undefined> {
  const [account] = await db
    .select()
    .from(workspaceAccountsTable)
    .where(eq(workspaceAccountsTable.id, id))
    .limit(1);
  return account;
}

export async function deleteWorkspaceAccount(id: number): Promise<void> {
  await db
    .delete(workspaceAccountsTable)
    .where(eq(workspaceAccountsTable.id, id));
}

/** Whether an account other than this one already has the tutor profile. */
export async function isTutorAssignedElsewhere(
  tutorId: number,
  accountId: number,
): Promise<boolean> {
  const [assignedAccount] = await db
    .select({ id: workspaceAccountsTable.id })
    .from(workspaceAccountsTable)
    .where(
      and(
        eq(workspaceAccountsTable.tutorId, tutorId),
        ne(workspaceAccountsTable.id, accountId),
      ),
    )
    .limit(1);
  return Boolean(assignedAccount);
}

export async function updateWorkspaceAccount(
  id: number,
  values: Pick<WorkspaceAccount, "role" | "tutorId">,
): Promise<WorkspaceAccount | undefined> {
  const [updated] = await db
    .update(workspaceAccountsTable)
    .set(values)
    .where(eq(workspaceAccountsTable.id, id))
    .returning();
  return updated;
}

export async function findOrProvisionFromClerkUser(
  userId: string,
): Promise<WorkspaceAccount | null> {
  const user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.emailAddresses.find(
    (item) => item.id === user.primaryEmailAddressId,
  );
  const email = primaryEmail?.emailAddress ?? "";

  const [existing] = await db
    .select()
    .from(workspaceAccountsTable)
    .where(eq(workspaceAccountsTable.clerkUserId, userId))
    .limit(1);

  if (existing) {
    if (
      primaryEmail?.verification?.status === "verified" &&
      email !== existing.email
    ) {
      const [updated] = await db
        .update(workspaceAccountsTable)
        .set({ email })
        .where(eq(workspaceAccountsTable.id, existing.id))
        .returning();
      return ensureTutorDraft(updated ?? existing);
    }
    return ensureTutorDraft(existing);
  }

  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }

  const [existingByEmail] = await db
    .select()
    .from(workspaceAccountsTable)
    .where(ilike(workspaceAccountsTable.email, email))
    .orderBy(asc(workspaceAccountsTable.id))
    .limit(1);
  if (existingByEmail) {
    return ensureTutorDraft(existingByEmail);
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || email;

  const created = await db.transaction(async (tx) => {
    const [createdByAnotherRequest] = await tx
      .select()
      .from(workspaceAccountsTable)
      .where(eq(workspaceAccountsTable.clerkUserId, userId))
      .limit(1);
    if (createdByAnotherRequest) return createdByAnotherRequest;

    const [createdByAnotherEmail] = await tx
      .select()
      .from(workspaceAccountsTable)
      .where(ilike(workspaceAccountsTable.email, email))
      .orderBy(asc(workspaceAccountsTable.id))
      .limit(1);
    if (createdByAnotherEmail) return createdByAnotherEmail;

    const [createdAccount] = await tx
      .insert(workspaceAccountsTable)
      .values({
        clerkUserId: userId,
        email,
        displayName,
        role: "pending",
      })
      .returning();
    return createdAccount;
  });
  return ensureTutorDraft(created);
}

export async function ensureTutorDraft(
  account: WorkspaceAccount,
): Promise<WorkspaceAccount> {
  if (account.role !== "tutor" || account.tutorId != null) return account;

  const displayName = account.displayName.trim() || account.email;
  const { firstName, lastName } = splitTutorName(displayName);
  const name = [firstName, lastName].filter(Boolean).join(" ") || displayName;
  const draft = await newDraftTutor(name);
  if (!draft) return account;

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(workspaceAccountsTable)
      .where(eq(workspaceAccountsTable.id, account.id))
      .limit(1);
    if (!current || current.role !== "tutor" || current.tutorId != null) {
      return current ?? account;
    }

    const tutor = await createTutor(draft, tx);

    const [updated] = await tx
      .update(workspaceAccountsTable)
      .set({ tutorId: tutor.id })
      .where(eq(workspaceAccountsTable.id, current.id))
      .returning();
    return updated ?? current;
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}