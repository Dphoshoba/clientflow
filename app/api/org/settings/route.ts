import { UserRole } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
}).strict();

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;

  const organization = await prisma.organization.findUnique({
    where: { id: access.membership.organizationId },
    select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
  });
  return NextResponse.json(organization);
}

export async function PATCH(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;
  if (access.membership.role !== UserRole.OWNER && access.membership.role !== UserRole.ADMIN) {
    return apiError("FORBIDDEN", "Only owners and admins can update branding", 403);
  }

  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return apiError("INVALID_INPUT", "Provide a valid branding change", 400);
  }

  const organization = await prisma.organization.update({
    where: { id: access.membership.organizationId },
    data: parsed.data,
    select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
  });
  return NextResponse.json(organization);
}