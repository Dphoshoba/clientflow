import { prisma } from "@/lib/prisma";

export async function logAction(input: {
  organizationId: string;
  userId?: string;
  action: string;
  details: string;
}) {
  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      details: input.details,
    },
  });
}