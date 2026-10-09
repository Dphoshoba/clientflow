import { z } from "zod";
import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const client = await prisma.client.findUnique({ where: { id }, select: { organizationId: true } });
  if (!client) return apiError("NOT_FOUND", "Client not found", 404);
  const access = await getOrganizationAccess(client.organizationId);
  if ("response" in access) return access.response;

  const parsed = contactSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_INPUT", "Contact name and valid email are required", 400);
  const contact = await prisma.clientContact.create({ data: { clientId: id, name: parsed.data.name, email: parsed.data.email.toLowerCase() } });
  return NextResponse.json(contact, { status: 201 });
}