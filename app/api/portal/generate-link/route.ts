import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { createPortalToken } from "@/lib/portal-token";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ clientContactId: z.string().min(1), projectId: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Client contact and project are required", 400);

  const contact = await prisma.clientContact.findUnique({
    where: { id: parsed.data.clientContactId },
    select: { id: true, clientId: true, client: { select: { organizationId: true } } },
  });
  if (!contact) return apiError("NOT_FOUND", "Client contact not found", 404);

  const access = await getOrganizationAccess(contact.client.organizationId);
  if ("response" in access) return access.response;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, clientId: contact.clientId },
    select: { id: true },
  });
  if (!project) return apiError("NOT_FOUND", "Project not found for this client", 404);

  const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!appUrl) return apiError("CONFIGURATION_ERROR", "Application URL is not configured", 503);

  try {
    const token = createPortalToken(contact.id, project.id);
    const portalUrl = new URL(`/portal/${token}`, appUrl).toString();
    return NextResponse.json({ portalUrl, expiresInSeconds: 60 * 60 * 24 * 14 }, { status: 201 });
  } catch {
    return apiError("CONFIGURATION_ERROR", "Portal signing is not configured", 503);
  }
}