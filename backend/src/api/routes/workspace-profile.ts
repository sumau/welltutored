import { Router, type IRouter } from "express";
import {
  DiscardWorkspaceProfileDraftResponse,
  UpdateWorkspaceProfileBody,
  UpdateWorkspaceProfileResponse,
} from "../schemas";
import {
  deleteTutorDraft,
  findTutor,
  findTutorDraft,
  listOtherTutorTints,
  publishTutorProfile,
  saveTutorDraft,
  type Tutor,
} from "../../crud/tutors";
import { listPublishedResourcesByTutor } from "../../crud/resources";
import { applyTutorDraft } from "../../domain/tutor-drafts";
import { truncateAtWordBoundary } from "../../domain/text";
import { splitTutorName } from "../../domain/tutor-names";
import { publicTutorSlug } from "../../domain/tutor-slugs";
import { normalizeTutorTint } from "../../domain/tutor-accents";
import {
  requireApproved,
  requireWorkspaceAccount as workspaceAccount,
} from "../deps";
import { isUniqueViolation } from "../../crud/workspace-accounts";
import { toTutorResponse } from "../presenters/tutor-presenter";
import { toResourceSummary } from "../presenters/resource-presenter";
import { isPublishableProfile } from "../../domain/workspace-validation";

const router: IRouter = Router();

router.patch("/workspace/profile", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;
  if (!account.tutorId) {
    res.status(403).json({ error: "A tutor profile must be assigned first." });
    return;
  }
  const body = UpdateWorkspaceProfileBody.safeParse(req.body);
  if (!body.success) {
    const details = body.error.issues.map((issue) => ({
      path: issue.path.join(".") || "profile",
      message: issue.message,
    }));
    console.warn("Invalid workspace profile update", {
      accountId: account.id,
      details,
    });
    res.status(400).json({
      error: "Please check the profile fields.",
      details,
    });
    return;
  }
  const existingTutor = await findTutor(account.tutorId);
  if (!existingTutor) {
    res.status(404).json({ error: "Tutor profile not found." });
    return;
  }
  if (existingTutor.profileStatus === "archived") {
    res.status(409).json({
      error: "Restore the tutor profile before editing it.",
    });
    return;
  }
  const existingDraft = await findTutorDraft(existingTutor.id);
  const editableTutor = applyTutorDraft(existingTutor, existingDraft);

  if (body.data.tint) {
    const otherTutors = await listOtherTutorTints(existingTutor.id);
    if (
      otherTutors.some(
        (tutor) => normalizeTutorTint(tutor.tint) === body.data.tint,
      )
    ) {
      res.status(409).json({
        error: "That profile accent is already in use by another tutor.",
      });
      return;
    }
  }

  const {
    rate,
    name: legacyName,
    firstName: requestedFirstName,
    lastName: requestedLastName,
  } = body.data;
  const legacyParts = splitTutorName(legacyName ?? editableTutor.name);
  const nextFirstName =
    requestedFirstName ?? (editableTutor.firstName || legacyParts.firstName);
  const nextLastName =
    requestedLastName ?? (editableTutor.lastName || legacyParts.lastName);
  const nextName =
    [nextFirstName, nextLastName].filter(Boolean).join(" ") ||
    editableTutor.name;
  const nextProfileStatus = body.data.status ?? editableTutor.profileStatus;
  const publishableProfile = {
    firstName: nextFirstName,
    lastName: nextLastName,
    initials: body.data.initials ?? editableTutor.initials,
    subject: body.data.subject ?? editableTutor.subject,
    profileSummary: body.data.profileSummary ?? editableTutor.profileSummary,
    university: body.data.university ?? editableTutor.university,
    qualification: body.data.qualification ?? editableTutor.qualification,
    bio: body.data.bio ?? editableTutor.bio,
    experience: (body.data.experience ?? editableTutor.experience).trim(),
    education: (body.data.education ?? editableTutor.education).trim(),
    teachingIntro: body.data.teachingIntro ?? editableTutor.teachingIntro,
    teachingPoints: body.data.teachingPoints ?? editableTutor.teachingPoints,
    rate: rate == null ? Number(editableTutor.rate) : rate,
    availability: (body.data.availability ?? editableTutor.availability).trim(),
    intake: body.data.intake ?? editableTutor.intake,
    tint: body.data.tint ?? normalizeTutorTint(editableTutor.tint),
  };
  if (
    nextProfileStatus === "published" &&
    !isPublishableProfile(publishableProfile)
  ) {
    res.status(400).json({
      error: "Complete the profile before publishing it.",
    });
    return;
  }

  const nextProfile = {
    name: nextName,
    firstName: nextFirstName,
    lastName: nextLastName,
    initials: publishableProfile.initials,
    subject: publishableProfile.subject,
    support: body.data.support ?? editableTutor.support,
    profileSummary: publishableProfile.profileSummary,
    university: publishableProfile.university,
    qualification: publishableProfile.qualification,
    bio: publishableProfile.bio,
    experience: publishableProfile.experience,
    education: publishableProfile.education,
    teachingIntro: truncateAtWordBoundary(publishableProfile.teachingIntro, 200),
    teachingPoints: publishableProfile.teachingPoints,
    rate: publishableProfile.rate,
    availability: publishableProfile.availability,
    intake: publishableProfile.intake,
    tint: publishableProfile.tint,
  };

  const profileValues = { ...nextProfile, rate: String(nextProfile.rate) };
  let tutor: Tutor;
  try {
    if (nextProfileStatus === "draft") {
      const draft = await saveTutorDraft(existingTutor.id, profileValues);
      tutor = applyTutorDraft(existingTutor, draft);
    } else {
      tutor = await publishTutorProfile(existingTutor.id, profileValues);
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({
        error: "That profile accent is already in use by another tutor.",
      });
      return;
    }
    throw error;
  }
  const resources = await listPublishedResourcesByTutor(tutor.id);
  res.json(
    UpdateWorkspaceProfileResponse.parse({
      ...toTutorResponse(
        tutor,
        resources.map(({ resource, author }) =>
          toResourceSummary(resource, author, author.slug),
        ),
        nextProfileStatus === "draft"
          ? publicTutorSlug(existingTutor.name)
          : publicTutorSlug(tutor.name),
      ),
    }),
  );
});

router.delete("/workspace/profile/draft", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;
  if (!account.tutorId) {
    res.status(403).json({ error: "A tutor profile must be assigned first." });
    return;
  }

  const tutor = await findTutor(account.tutorId);
  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found." });
    return;
  }
  if (tutor.profileStatus !== "published") {
    res.status(409).json({
      error: "There is no published profile to restore.",
    });
    return;
  }

  await deleteTutorDraft(tutor.id);

  const resources = await listPublishedResourcesByTutor(tutor.id);

  res.json(
    DiscardWorkspaceProfileDraftResponse.parse(
      toTutorResponse(
        tutor,
        resources.map(({ resource, author }) =>
          toResourceSummary(resource, author, author.slug),
        ),
      ),
    ),
  );
});

export default router;