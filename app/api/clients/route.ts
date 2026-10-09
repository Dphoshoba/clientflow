import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
}).refine((value) => Boolean(value.contactName) === Boolean(value.contactEmail), "Contact name and email must be provided together");

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;

  const clients = await prisma.client.findMany({
    where: { organizationId: access.membership.organizationId },
    select: { id: true, name: true, contacts: { select: { id: true, name: true, email: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const access = await getOrganizationAccess(new URL(request.url).searchParams.get("organizationId"));
  if ("response" in access) return access.response;

  const parsed = clientSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Client name is required", 400);
  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      organizationId: access.membership.organizationId,
      contacts: parsed.data.contactName && parsed.data.contactEmail
        ? { create: { name: parsed.data.contactName, email: parsed.data.contactEmail.toLowerCase() } }
        : undefined,
    },
    select: { id: true, name: true, contacts: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(client, { status: 201 });
}