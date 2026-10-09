import { DeliverableStatus } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-token";
import { isValidStatusTransition } from "@/lib/status-service";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ token: z.string().min(1), versionId: z.string().min(1), content: z.string().trim().min(1).max(5000) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "A comment is required" } }, { status: 400 });
  const claims = verifyPortalToken(parsed.data.token);
  if (!claims) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired review link" } }, { status: 401 });

  const contact = await prisma.clientContact.findUnique({ where: { id: claims.clientContactId }, select: { email: true, clientId: true, client: { select: { organizationId: true } } } });
  const version = await prisma.deliverableVersion.findFirst({
    where: { id: parsed.data.versionId, deliverable: { projectId: claims.projectId, project: { clientId: contact?.clientId } } },
    include: { deliverable: true },
  });
  if (!contact || !version) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review item not found" } }, { status: 404 });
  if (!isValidStatusTransition(version.deliverable.status, DeliverableStatus.CHANGES_REQUESTED)) {
    return NextResponse.json({ error: { code: "INVALID_STATE", message: "Feedback can only be submitted while this item is in review" } }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.comment.create({
      data: { content: parsed.data.content, isInternal: false, contactEmail: contact.email, deliverableVersionId: version.id },
    }),
    prisma.deliverable.update({ where: { id: version.deliverableId }, data: { status: DeliverableStatus.CHANGES_REQUESTED } }),
    prisma.activityLog.create({
      data: {
        organizationId: contact.client.organizationId,
        action: "CHANGES_REQUESTED",
        details: `Client requested changes to ${version.deliverable.name} V${version.versionNumber}`,
      },
    }),
  ]);
  return NextResponse.json({ message: "Feedback submitted", status: DeliverableStatus.CHANGES_REQUESTED }, { status: 201 });
}