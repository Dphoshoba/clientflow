import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const commentSchema = z.object({ content: z.string().trim().min(1).max(5000), isInternal: z.boolean().default(false) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: { project: { select: { client: { select: { organizationId: true } } } }, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!deliverable) return apiError("NOT_FOUND", "Deliverable not found", 404);
  const access = await getOrganizationAccess(deliverable.project.client.organizationId);
  if ("response" in access) return access.response;
  if (!deliverable.versions[0]) return apiError("NO_VERSION", "Upload a version before commenting", 409);

  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Comment text is required", 400);

  const comment = await prisma.comment.create({
    data: {
      ...parsed.data,
      userId: access.user.id,
      deliverableVersionId: deliverable.versions[0].id,
    },
  });
  return NextResponse.json(comment, { status: 201 });
}