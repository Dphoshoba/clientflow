import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const createDeliverableSchema = z.object({ projectId: z.string().min(1), name: z.string().trim().min(1).max(160) });

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get("projectId");
  if (!projectId) return apiError("INVALID_INPUT", "projectId is required", 400);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { client: { select: { organizationId: true } } },
  });
  if (!project) return apiError("NOT_FOUND", "Project not found", 404);

  const access = await getOrganizationAccess(project.client.organizationId);
  if ("response" in access) return access.response;

  const deliverables = await prisma.deliverable.findMany({
    where: { projectId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { id: true, versionNumber: true, fileName: true, contentType: true, createdAt: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(deliverables);
}

export async function POST(request: Request) {
  const parsed = createDeliverableSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Project and deliverable name are required", 400);

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { client: { select: { organizationId: true } } },
  });
  if (!project) return apiError("NOT_FOUND", "Project not found", 404);

  const access = await getOrganizationAccess(project.client.organizationId);
  if ("response" in access) return access.response;

  const deliverable = await prisma.deliverable.create({
    data: { projectId: parsed.data.projectId, name: parsed.data.name },
  });
  return NextResponse.json(deliverable, { status: 201 });
}