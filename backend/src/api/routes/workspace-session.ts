import { Router, type IRouter } from "express";
import { GetWorkspaceSessionResponse } from "../schemas";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import { requireWorkspaceAccount as workspaceAccount } from "../deps";
import {
  availableTutorAccents,
  findTutor,
  findWorkspaceTutor,
} from "../../crud/tutors";
import { toTutorResponse } from "../presenters/tutor-presenter";

const router: IRouter = Router();

router.get("/workspace/me", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account) return;

  const tutor = account.tutorId ? await findTutor(account.tutorId) : undefined;
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