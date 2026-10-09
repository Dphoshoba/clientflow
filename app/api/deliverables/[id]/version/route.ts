import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { objectExists } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

const versionSchema = z.object({ fileKey: z.string().min(1).max(1024), fileName: z.string().trim().min(1).max(180), contentType: z.string().min(1).max(120) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: { project: { select: { client: { select: { organizationId: true } } } } },
  });
  if (!deliverable) return apiError("NOT_FOUND", "Deliverable not found", 404);
  const access = await getOrganizationAccess(deliverable.project.client.organizationId);
  if ("response" in access) return access.response;

  const parsed = versionSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.fileKey.startsWith(`uploads/${id}/`)) {
    return apiError("INVALID_INPUT", "Version upload details are invalid", 400);
  }

  try {
    await objectExists(parsed.data.fileKey);
    const version = await prisma.$transaction(async (transaction) => {
      const previous = await transaction.deliverableVersion.findFirst({
        where: { deliverableId: id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const created = await transaction.deliverableVersion.create({
        data: {
          deliverableId: id,
          versionNumber: (previous?.versionNumber ?? 0) + 1,
          fileKey: parsed.data.fileKey,
          fileName: parsed.data.fileName,
          contentType: parsed.data.contentType,
        },
        select: { id: true, deliverableId: true, versionNumber: true, fileName: true, contentType: true, createdAt: true },
      });
      await transaction.deliverable.update({
        where: { id },
        data: { status: "DRAFT" },
      });
      await transaction.activityLog.create({
        data: {
          organizationId: access.membership.organizationId,
          userId: access.user.id,
          action: "VERSION_UPLOADED",
          details: `${deliverable.name} V${created.versionNumber} uploaded`,
        },
      });
      return created;
    });
    return NextResponse.json(version, { status: 201 });
  } catch {
    return apiError("UPLOAD_NOT_FOUND", "Uploaded file could not be verified or storage URL is missing", 400);
  }
}