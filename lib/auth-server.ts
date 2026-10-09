import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { orderBy: { organization: { createdAt: "asc" } } } },
  });
}

export async function getOrganizationAccess(organizationId?: string | null) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { response: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 }) };
  }

  const membership = organizationId
    ? user.memberships.find((item) => item.organizationId === organizationId)
    : user.memberships[0];

  if (!membership) {
    return { response: NextResponse.json({ error: { code: "FORBIDDEN", message: "Organization access denied" } }, { status: 403 }) };
  }

  return { user, membership };
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}