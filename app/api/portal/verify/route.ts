import { NextResponse } from "next/server";
import { inspectPortalToken } from "@/lib/portal-token";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, error: { code: "TOKEN_REQUIRED", message: "Portal token is required" } }, { status: 400 });

  const inspected = inspectPortalToken(token);
  if (!inspected) {
    return NextResponse.json({ valid: false, expired: false, error: { code: "INVALID_TOKEN", message: "This review link is invalid" } }, { status: 401 });
  }
  if (inspected.expired) {
    return NextResponse.json({ valid: false, expired: true, expiresAt: new Date(inspected.claims.exp * 1000).toISOString(), error: { code: "TOKEN_EXPIRED", message: "This review link has expired" } }, { status: 401 });
  }

  const contact = await prisma.clientContact.findUnique({
    where: { id: inspected.claims.clientContactId },
    include: { client: { select: { id: true, name: true, organization: { select: { name: true, logoUrl: true, primaryColor: true } } } } },
  });
  const project = contact && await prisma.project.findFirst({
    where: { id: inspected.claims.projectId, clientId: contact.clientId },
    include: {
      deliverables: {
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            include: {
              comments: { where: { isInternal: false }, select: { id: true } },
              decisions: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!contact || !project) {
    return NextResponse.json({ valid: false, expired: false, error: { code: "ACCESS_REVOKED", message: "This review link no longer has access" } }, { status: 403 });
  }

  const deliverables = project.deliverables.map((deliverable) => {
    const version = deliverable.versions[0];
    return {
      id: deliverable.id,
      name: deliverable.name,
      status: deliverable.status,
      updatedAt: deliverable.updatedAt,
      currentVersion: version ? {
        id: version.id,
        versionNumber: version.versionNumber,
        fileName: version.fileName,
        fileUrl: `/api/portal/file?token=${encodeURIComponent(token)}&versionId=${encodeURIComponent(version.id)}`,
        contentType: version.contentType,
        commentCount: version.comments.length,
        latestDecision: version.decisions[0] ?? null,
      } : null,
    };
  });

  return NextResponse.json({
    valid: true,
    expired: false,
    expiresAt: new Date(inspected.claims.exp * 1000).toISOString(),
    client: { name: contact.client.name, contactName: contact.name },
    organization: contact.client.organization,
    project: { id: project.id, name: project.name },
    deliverables,
  });
}