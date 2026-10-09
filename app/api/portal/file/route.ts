import { NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-token";
import { createDownloadUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get("token");
  const versionId = searchParams.get("versionId");
  const claims = token ? verifyPortalToken(token) : null;
  if (!claims || !versionId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired review link" } }, { status: 401 });

  const contact = await prisma.clientContact.findUnique({ where: { id: claims.clientContactId }, select: { clientId: true } });
  if (!contact) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Review access is no longer available" } }, { status: 403 });
  const version = await prisma.deliverableVersion.findFirst({
    where: { id: versionId, deliverable: { projectId: claims.projectId, project: { clientId: contact.clientId } } },
    select: { fileKey: true },
  });
  if (!version) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File version not found" } }, { status: 404 });

  try {
    const url = await createDownloadUrl(version.fileKey);
    return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "File could not be retrieved" } }, { status: 503 });
  }
}