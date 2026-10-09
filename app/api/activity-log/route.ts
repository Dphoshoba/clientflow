import { NextResponse } from "next/server";
import { getOrganizationAccess, apiError } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const organizationId = searchParams.get("organizationId");
  const parsedLimit = Number(searchParams.get("limit") ?? "50");
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return apiError("INVALID_INPUT", "limit must be between 1 and 100", 400);
  }

  const access = await getOrganizationAccess(organizationId);
  if ("response" in access) return access.response;

  const logs = await prisma.activityLog.findMany({
    where: { organizationId: access.membership.organizationId },
    orderBy: { createdAt: "desc" },
    take: parsedLimit,
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(logs);
}