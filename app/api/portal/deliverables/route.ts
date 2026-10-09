import { NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-token";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const claims = token ? verifyPortalToken(token) : null;
  if (!claims) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired review link" } }, { status: 401 });

  const contact = await prisma.clientContact.findUnique({ where: { id: claims.clientContactId }, select: { clientId: true } });
  if (!contact) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Review access is no longer available" } }, { status: 403 });

  const project = await prisma.project.findFirst({
    where: { id: claims.projectId, clientId: contact.clientId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Review access is no longer available" } }, { status: 403 });

  const deliverables = await prisma.deliverable.findMany({
    where: { projectId: project.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
          decisions: { orderBy: { createdAt: "desc" } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(deliverables.map((deliverable) => ({
    ...deliverable,
    versions: deliverable.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      contentType: version.contentType,
      createdAt: version.createdAt,
      comments: version.comments,
      decisions: version.decisions,
      fileUrl: `/api/portal/file?token=${encodeURIComponent(token!)}&versionId=${encodeURIComponent(version.id)}`,
    })),
  })));
}