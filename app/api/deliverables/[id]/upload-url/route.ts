import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { createUploadUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

const uploadSchema = z.object({ fileName: z.string().trim().min(1).max(180), contentType: z.string().min(1).max(120) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    select: { project: { select: { client: { select: { organizationId: true } } } } },
  });
  if (!deliverable) return apiError("NOT_FOUND", "Deliverable not found", 404);
  const access = await getOrganizationAccess(deliverable.project.client.organizationId);
  if ("response" in access) return access.response;

  const parsed = uploadSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "File name and content type are required", 400);

  const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "upload";
  const fileKey = `uploads/${id}/${randomUUID()}-${safeName}`;
  try {
    const uploadUrl = await createUploadUrl(fileKey, parsed.data.contentType);
    return NextResponse.json({ uploadUrl, fileKey, expiresInSeconds: 600 });
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "File storage is not configured", 503);
  }
}