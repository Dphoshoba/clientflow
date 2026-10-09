import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { client: { select: { organizationId: true } } },
  });
  if (!project) return apiError("NOT_FOUND", "Project not found", 404);

  const access = await getOrganizationAccess(project.client.organizationId);
  if ("response" in access) return access.response;

  const result = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { id: true, versionNumber: true, fileName: true, createdAt: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return NextResponse.json(result);
}