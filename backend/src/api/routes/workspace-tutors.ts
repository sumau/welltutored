import { Router, type IRouter } from "express";
import {
  ArchiveWorkspaceTutorParams,
  ArchiveWorkspaceTutorResponse,
  CreateWorkspaceTutorBody,
  CreateWorkspaceTutorResponse,
  DeleteWorkspaceTutorParams,
  ListWorkspaceTutorsResponse,
  RestoreWorkspaceTutorParams,
  RestoreWorkspaceTutorResponse,
} from "../schemas";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import {
  createTutor,
  deleteTutor,
  findTutor,
  listTutorDrafts,
  listTutors,
  newDraftTutor,
  setTutorProfileStatus,
} from "../../crud/tutors";
import {
  requireOwner,
  requireWorkspaceAccount as workspaceAccount,
} from "../deps";
import { toTutorResponse } from "../presenters/tutor-presenter";

const router: IRouter = Router();

router.get("/workspace/tutors", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const tutors = await listTutors();
  const drafts = await listTutorDrafts();
  const draftsByTutorId = new Map(drafts.map((draft) => [draft.tutorId, draft]));
  res.json(
    ListWorkspaceTutorsResponse.parse(
      tutors.map((tutor) =>
        toTutorResponse(
            tutor,
          [],
          publicTutorSlug(tutor.name),
        ),
      ),
    ),
  );
});

router.post("/workspace/tutors", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const body = CreateWorkspaceTutorBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Please check the tutor profile fields." });
    return;
  }

  const draft = await newDraftTutor(body.data.name);
  if (!draft) {
    res.status(409).json({
      error: "All approved profile accents are already assigned.",
    });
    return;
  }
  const tutor = await createTutor(draft);

  res.status(201).json(
    CreateWorkspaceTutorResponse.parse(toTutorResponse(tutor)),
  );
});

router.post("/workspace/tutors/:id", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const params = ArchiveWorkspaceTutorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid tutor profile." });
    return;
  }

  const tutor = await findTutor(params.data.id);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found." });
    return;
  }

  const archived = await setTutorProfileStatus(params.data.id, "archived");

  res.json(ArchiveWorkspaceTutorResponse.parse(toTutorResponse(archived)));
});

router.put("/workspace/tutors/:id", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const params = RestoreWorkspaceTutorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid tutor profile." });
    return;
  }

  const tutor = await findTutor(params.data.id);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found." });
    return;
  }

  const restored = await setTutorProfileStatus(params.data.id, "draft");

  res.json(RestoreWorkspaceTutorResponse.parse(toTutorResponse(restored)));
});

router.delete("/workspace/tutors/:id", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const params = DeleteWorkspaceTutorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid tutor profile." });
    return;
  }

  if (!(await deleteTutor(params.data.id))) {
    res.status(404).json({ error: "Tutor profile not found." });
    return;
  }

  res.sendStatus(204);
});

export default router;