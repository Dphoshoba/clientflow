import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : requestUrl.origin);
  const token = requestUrl.searchParams.get("token");
  const loginUrl = new URL("/login?error=expired", origin);
  if (!token) return NextResponse.redirect(loginUrl);

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.redirect(loginUrl);
  }

  const handoffUrl = new URL("/login/verify", origin);
  handoffUrl.searchParams.set("token", token);
  return NextResponse.redirect(handoffUrl);
}