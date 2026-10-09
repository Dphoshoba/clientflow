import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { createDownloadUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const versionId = new URL(request.url).searchParams.get("versionId");
  if (!versionId) return apiError("INVALID_INPUT", "versionId is required", 400);

  const version = await prisma.deliverableVersion.findFirst({
    where: { id: versionId, deliverableId: id },
    select: { fileKey: true, deliverable: { select: { project: { select: { client: { select: { organizationId: true } } } } } } },
  });
  if (!version) return apiError("NOT_FOUND", "File version not found", 404);

  const access = await getOrganizationAccess(version.deliverable.project.client.organizationId);
  if ("response" in access) return access.response;
  try {
    const url = await createDownloadUrl(version.fileKey);
    return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "File could not be retrieved", 503);
  }
}