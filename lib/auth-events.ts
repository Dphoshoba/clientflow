import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

function digest(value: string) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "clientflow-local")
    .update(value)
    .digest("hex");
}

export async function recordAuthEvent(event: string, email?: string, ip?: string) {
  try {
    await prisma.authEvent.create({
      data: {
        event,
        emailDigest: email ? digest(email.trim().toLowerCase()) : undefined,
        ipDigest: ip ? digest(ip) : undefined,
      },
    });
  } catch {
    console.error("Unable to persist authentication event", { event });
  }
}