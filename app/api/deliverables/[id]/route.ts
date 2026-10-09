import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true, client: { select: { id: true, name: true, organizationId: true } } } } },
  });
  if (!deliverable) return apiError("NOT_FOUND", "Deliverable not found", 404);

  const access = await getOrganizationAccess(deliverable.project.client.organizationId);
  if ("response" in access) return access.response;

  const result = await prisma.deliverable.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, contacts: { select: { id: true, name: true, email: true } } } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          comments: { orderBy: { createdAt: "asc" } },
          decisions: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!result) return apiError("NOT_FOUND", "Deliverable not found", 404);
  return NextResponse.json({
    ...result,
    versions: result.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      contentType: version.contentType,
      createdAt: version.createdAt,
      comments: version.comments,
      decisions: version.decisions,
      fileUrl: `/api/deliverables/${id}/download?versionId=${encodeURIComponent(version.id)}`,
    })),
  });
}