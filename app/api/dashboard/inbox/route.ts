import { DeliverableStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getOrganizationAccess } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;

  const deliverables = await prisma.deliverable.findMany({
    where: { project: { client: { organizationId: access.membership.organizationId } } },
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return NextResponse.json({
    waitingOnClient: deliverables.filter((item) => item.status === DeliverableStatus.IN_REVIEW),
    needsTeamAction: deliverables.filter((item) => item.status === DeliverableStatus.CHANGES_REQUESTED),
    approvedThisWeek: deliverables.filter((item) => item.status === DeliverableStatus.APPROVED && item.updatedAt >= weekAgo),
  });
}