import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({ name: z.string().trim().min(1).max(120), clientId: z.string().min(1) });

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;

  const projects = await prisma.project.findMany({
    where: { client: { organizationId: access.membership.organizationId } },
    include: {
      client: { select: { id: true, name: true } },
      deliverables: { select: { id: true, name: true, status: true, updatedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const access = await getOrganizationAccess(new URL(request.url).searchParams.get("organizationId"));
  if ("response" in access) return access.response;

  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Project name and client are required", 400);

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, organizationId: access.membership.organizationId },
    select: { id: true },
  });
  if (!client) return apiError("NOT_FOUND", "Client not found", 404);

  const project = await prisma.project.create({
    data: { name: parsed.data.name, clientId: client.id },
    include: { client: { select: { id: true, name: true } }, deliverables: true },
  });
  return NextResponse.json(project, { status: 201 });
}