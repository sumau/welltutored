import { Router, type IRouter } from "express";
import {
  ListWorkspaceAccountsResponse,
  UpdateWorkspaceAccountBody,
  UpdateWorkspaceAccountParams,
  UpdateWorkspaceAccountResponse,
} from "../schemas";
import { findTutorSummary, tutorExists } from "../../crud/tutors";
import {
  deleteWorkspaceAccount,
  findWorkspaceAccount,
  isTutorAssignedElsewhere,
  listWorkspaceAccounts,
  updateWorkspaceAccount,
} from "../../crud/workspace-accounts";
import {
  requireOwner,
  requireWorkspaceAccount as workspaceAccount,
} from "../deps";

const router: IRouter = Router();

router.get("/workspace/accounts", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;
  const rows = await listWorkspaceAccounts();
  res.json(
    ListWorkspaceAccountsResponse.parse(
      rows.map(({
        account: item,
        tutorName,
        tutorProfileStatus,
      }) => ({
        id: item.id,
        role: item.role,
        email: item.email,
        displayName: item.displayName,
        tutorId: item.tutorId,
        tutorName,
        tutorProfileStatus,
      })),
    ),
  );
});

router.delete("/workspace/accounts/:id", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;

  const params = UpdateWorkspaceAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid Workspace account." });
    return;
  }

  const target = await findWorkspaceAccount(params.data.id);
  if (!target) {
    res.status(404).json({ error: "Workspace account not found." });
    return;
  }
  if (target.role === "owner") {
    res.status(400).json({ error: "The owner account cannot be deleted." });
    return;
  }

  await deleteWorkspaceAccount(params.data.id);
  res.sendStatus(204);
});

router.patch("/workspace/accounts/:id", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireOwner(account, res)) return;
  const params = UpdateWorkspaceAccountParams.safeParse(req.params);
  const body = UpdateWorkspaceAccountBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Please check the account assignment." });
    return;
  }
  const target = await findWorkspaceAccount(params.data.id);
  if (!target) {
    res.status(404).json({ error: "Workspace account not found." });
    return;
  }
  if (target.role === "owner" && body.data.role !== "owner") {
    res.status(400).json({ error: "The owner account must remain an owner." });
    return;
  }
  if (target.role !== "owner" && body.data.role === "owner") {
    res.status(400).json({ error: "Only the existing owner account can have the owner role." });
    return;
  }
  if (body.data.role === "pending" && body.data.tutorId != null) {
    res.status(400).json({ error: "Pending accounts cannot have a tutor profile." });
    return;
  }
  if (body.data.tutorId != null) {
    if (!(await tutorExists(body.data.tutorId))) {
      res.status(400).json({ error: "Tutor profile not found." });
      return;
    }

    if (await isTutorAssignedElsewhere(body.data.tutorId, params.data.id)) {
      res.status(400).json({ error: "That tutor profile is already assigned to another account." });
      return;
    }
  }

  const updated = await updateWorkspaceAccount(params.data.id, {
    role: body.data.role,
    tutorId: body.data.tutorId ?? null,
  });
  if (!updated) {
    res.status(404).json({ error: "Workspace account not found." });
    return;
  }
  const tutor = updated.tutorId
    ? await findTutorSummary(updated.tutorId)
    : undefined;
  res.json(
    UpdateWorkspaceAccountResponse.parse({
      id: updated.id,
      role: updated.role,
      email: updated.email,
      displayName: updated.displayName,
      tutorId: updated.tutorId,
      tutorName: tutor?.name ?? null,
      tutorProfileStatus: tutor?.profileStatus ?? null,
    }),
  );
});

export default router;