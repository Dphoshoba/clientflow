import { ApprovalDecision, DeliverableStatus } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-token";
import { prisma } from "@/lib/prisma";
import { isValidStatusTransition } from "@/lib/status-service";

const requestSchema = z.object({
  token: z.string().min(1),
  deliverableId: z.string().min(1),
  note: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Approval request is incomplete" } }, { status: 400 });
  const claims = verifyPortalToken(parsed.data.token);
  if (!claims) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired review link" } }, { status: 401 });

  const contact = await prisma.clientContact.findUnique({ where: { id: claims.clientContactId }, select: { email: true, clientId: true, client: { select: { organizationId: true } } } });
  if (!contact) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Review access is no longer available" } }, { status: 403 });

  const deliverable = await prisma.deliverable.findFirst({
    where: { id: parsed.data.deliverableId, projectId: claims.projectId, project: { clientId: contact.clientId } },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!deliverable) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Deliverable not found" } }, { status: 404 });
  if (!isValidStatusTransition(deliverable.status, DeliverableStatus.APPROVED) || !deliverable.versions[0]) {
    return NextResponse.json({ error: { code: "INVALID_STATE", message: "This deliverable is not awaiting approval" } }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.approvalDecisionRecord.create({
      data: {
        decision: ApprovalDecision.APPROVED,
        note: parsed.data.note,
        decidedByEmail: contact.email,
        deliverableVersionId: deliverable.versions[0].id,
      },
    }),
    prisma.deliverable.update({ where: { id: deliverable.id }, data: { status: DeliverableStatus.APPROVED } }),
    prisma.activityLog.create({
      data: {
        organizationId: contact.client.organizationId,
        action: "DELIVERABLE_APPROVED",
        details: `${deliverable.name} V${deliverable.versions[0].versionNumber} approved by client`,
      },
    }),
  ]);
  return NextResponse.json({ message: "Approval recorded", status: DeliverableStatus.APPROVED });
}