import { DeliverableStatus } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { isValidStatusTransition } from "@/lib/status-service";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ status: z.nativeEnum(DeliverableStatus) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: { project: { select: { client: { select: { organizationId: true } } } } },
  });
  if (!deliverable) return apiError("NOT_FOUND", "Deliverable not found", 404);
  const access = await getOrganizationAccess(deliverable.project.client.organizationId);
  if ("response" in access) return access.response;

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "A valid status is required", 400);
  if (parsed.data.status === DeliverableStatus.APPROVED) {
    return apiError("PORTAL_APPROVAL_REQUIRED", "Client approval must be recorded through the review portal", 403);
  }
  if (!isValidStatusTransition(deliverable.status, parsed.data.status)) {
    return apiError("INVALID_TRANSITION", `Cannot move ${deliverable.status} to ${parsed.data.status}`, 409);
  }

  const [updated] = await prisma.$transaction([
    prisma.deliverable.update({ where: { id }, data: { status: parsed.data.status } }),
    prisma.activityLog.create({
      data: {
        organizationId: access.membership.organizationId,
        userId: access.user.id,
        action: "STATUS_CHANGED",
        details: `${deliverable.name}: ${deliverable.status} to ${parsed.data.status}`,
      },
    }),
  ]);
  return NextResponse.json(updated);
}