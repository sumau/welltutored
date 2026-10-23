import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { GetWorkspaceSessionResponse } from "../schemas";
import { db } from "../../core/db";
import { tutorsTable } from "../../models";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import {
  availableTutorAccents,
} from "../../crud/workspace-accounts";
import { requireWorkspaceAccount as workspaceAccount } from "../deps";
import {
  findWorkspaceTutor,
  toTutorResponse,
} from "../presenters/tutor-presenter";

const router: IRouter = Router();

router.get("/workspace/me", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account) return;

  const [tutor] = account.tutorId
    ? await db
        .select()
        .from(tutorsTable)
        .where(eq(tutorsTable.id, account.tutorId))
        .limit(1)
    : [];
  const editableTutor = tutor ? await findWorkspaceTutor(tutor) : undefined;

  res.json(
    GetWorkspaceSessionResponse.parse({
      id: account.id,
      role: account.role,
      email: account.email,
      displayName: account.displayName,
      availableTutorAccents: await availableTutorAccents(account.tutorId),
      tutor: editableTutor
        ? toTutorResponse(
            editableTutor,
            [],
            publicTutorSlug(tutor?.name ?? editableTutor.name),
          )
        : null,
    }),
  );
});

export default router;