import { Router, type IRouter, type Request } from "express";
import {
  CreateEnquiryBody,
  CreateEnquiryResponse,
  ListWorkspaceEnquiriesResponse,
  RetryWorkspaceEnquiryParams,
  RetryWorkspaceEnquiryResponse,
} from "../schemas";
import {
  createEnquiry,
  findEnquiryFor,
  listEnquiriesFor,
  markEnquiryDelivered,
  markEnquiryFailed,
} from "../../crud/enquiries";
import { findPublishedTutor } from "../../crud/tutors";
import { canReceivePublicEnquiries } from "../../domain/enquiries";
import {
  requireApproved,
  requireWorkspaceAccount as workspaceAccount,
} from "../deps";

const router: IRouter = Router();
const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const deliveryMessages = {
  pending: (tutorName: string) =>
    `Your enquiry was recorded and is waiting to be delivered to ${tutorName}.`,
  delivered: (tutorName: string) => `Your enquiry has been delivered to ${tutorName}.`,
  failed: (tutorName: string) =>
    `Your enquiry was recorded, but delivery to ${tutorName} needs attention. You do not need to submit it again.`,
} as const;

type DeliveryStatus = keyof typeof deliveryMessages;

function publicDeliveryStatus(value: string): DeliveryStatus {
  if (value === "delivered" || value === "failed") return value;
  return "pending";
}

function enquiryReceipt(
  enquiry: {
    id: number;
    createdAt: Date;
  },
  tutorName: string,
  deliveryStatus: DeliveryStatus,
) {
  return {
    id: enquiry.id,
    tutorName,
    receivedAt: enquiry.createdAt.toISOString(),
    deliveryStatus,
    message: deliveryMessages[deliveryStatus](tutorName),
  };
}

async function markDeliveryFailed(enquiryId: number, req: Request) {
  try {
    await markEnquiryFailed(enquiryId);
    return "failed" as const;
  } catch (error) {
    req.log.error({ err: error, enquiryId }, "Could not persist failed enquiry delivery");
    return "pending" as const;
  }
}

async function deliverEnquiry(
  enquiryId: number,
  req: Request,
) {
  try {
    if (!(await markEnquiryDelivered(enquiryId))) {
      throw new Error("Enquiry no longer exists");
    }
    return "delivered" as const;
  } catch (error) {
    req.log.error({ err: error, enquiryId }, "Enquiry delivery failed");
    return markDeliveryFailed(enquiryId, req);
  }
}

router.post("/enquiries", async (req, res): Promise<void> => {
  const parsed = CreateEnquiryBody.safeParse(req.body);
  if (!parsed.success || !simpleEmail.test(req.body?.email ?? "")) {
    res.status(400).json({ error: "Please check the enquiry details." });
    return;
  }

  const tutor = await findPublishedTutor(parsed.data.tutorSlug);

  if (!tutor) {
    res.status(400).json({ error: "Please select an available tutor." });
    return;
  }
  if (!canReceivePublicEnquiries(tutor)) {
    res.status(400).json({ error: "Please select an available tutor." });
    return;
  }

  const enquiry = await createEnquiry({
    tutorId: tutor.id,
    name: parsed.data.name,
    email: parsed.data.email,
    studentName: parsed.data.studentName,
    studentAge: parsed.data.studentAge,
    subjectLevel: parsed.data.subjectLevel,
    message: parsed.data.message,
    deliveryStatus: "pending",
  });

  const deliveryStatus = await deliverEnquiry(enquiry.id, req);
  req.log.info({ enquiryId: enquiry.id, tutorId: tutor.id, deliveryStatus }, "Named tutor enquiry accepted");

  res.status(201).json(
    CreateEnquiryResponse.parse(enquiryReceipt(enquiry, tutor.name, deliveryStatus)),
  );
});

router.get("/workspace/enquiries", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;

  const rows = await listEnquiriesFor(account);

  res.json(
    ListWorkspaceEnquiriesResponse.parse(
      rows.map(({ enquiry, tutorName }) => ({
        id: enquiry.id,
        tutorId: enquiry.tutorId,
        tutorName,
        name: enquiry.name,
        email: enquiry.email,
        studentName: enquiry.studentName,
        studentAge: enquiry.studentAge,
        subjectLevel: enquiry.subjectLevel,
        message: enquiry.message,
        deliveryStatus: publicDeliveryStatus(enquiry.deliveryStatus),
        createdAt: enquiry.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/workspace/enquiries/:id/retry", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;

  const params = RetryWorkspaceEnquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid enquiry." });
    return;
  }

  const row = await findEnquiryFor(account, params.data.id);

  if (!row) {
    res.status(404).json({ error: "Enquiry not found." });
    return;
  }

  const deliveryStatus = await deliverEnquiry(row.enquiry.id, req);
  if (deliveryStatus !== "delivered") {
    res.status(503).json({ error: "Delivery is still unavailable. Please try again later." });
    return;
  }

  res.json(
    RetryWorkspaceEnquiryResponse.parse({
      id: row.enquiry.id,
      tutorId: row.enquiry.tutorId,
      tutorName: row.tutorName,
      name: row.enquiry.name,
      email: row.enquiry.email,
      studentName: row.enquiry.studentName,
      studentAge: row.enquiry.studentAge,
      subjectLevel: row.enquiry.subjectLevel,
      message: row.enquiry.message,
      deliveryStatus,
      createdAt: row.enquiry.createdAt.toISOString(),
    }),
  );
});

export default router;