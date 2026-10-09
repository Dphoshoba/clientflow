import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";
import { recordAuthEvent } from "@/lib/auth-events";

const requestSchema = z.object({ email: z.string().trim().email().max(254) });
const genericResponse = { success: true, message: "If that address is registered, a sign-in link is on its way." };

function requestIp(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const ip = requestIp(request);
  let email = "";

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      await recordAuthEvent("SIGNIN_INVALID_INPUT", undefined, ip);
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Enter a valid email address." } }, { status: 400 });
    }

    email = parsed.data.email.toLowerCase();
    const emailDigest = createHash("sha256").update(email).digest("hex");
    const allowed = consumeAuthRateLimit(`ip:${ip}`, 10, 15 * 60_000)
      && consumeAuthRateLimit(`email:${emailDigest}`, 4, 15 * 60_000);

    if (!allowed) {
      await recordAuthEvent("SIGNIN_RATE_LIMITED", email, ip);
      return NextResponse.json(genericResponse);
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      await recordAuthEvent("SIGNIN_UNKNOWN_ADDRESS", email, ip);
      return NextResponse.json(genericResponse);
    }

    const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    const from = process.env.RESEND_FROM_EMAIL;
    if (!appUrl || !from || !process.env.RESEND_API_KEY) {
      await recordAuthEvent("SIGNIN_PROVIDER_MISCONFIGURED", email, ip);
      return NextResponse.json(genericResponse);
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60_000);

    await prisma.magicLinkToken.create({ data: { email, tokenHash, expiresAt } });
    const verifyUrl = new URL("/api/auth/verify", appUrl);
    verifyUrl.searchParams.set("token", token);

    after(async () => {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from,
          to: email,
          subject: "Your ClientFlow sign-in link",
          html: `<p>Use this one-time link to sign in to ClientFlow. It expires in 15 minutes.</p><p><a href="${verifyUrl.toString()}">Sign in to ClientFlow</a></p><p>If you did not request this link, you can ignore this email.</p>`,
        });
        if (result.error) {
          await prisma.magicLinkToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
          await recordAuthEvent("SIGNIN_EMAIL_FAILED", email, ip);
          return;
        }
        await recordAuthEvent("SIGNIN_LINK_SENT", email, ip);
      } catch {
        await prisma.magicLinkToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }).catch(() => undefined);
        await recordAuthEvent("SIGNIN_EMAIL_FAILED", email, ip);
      }
    });
    return NextResponse.json(genericResponse);
  } catch {
    await recordAuthEvent("SIGNIN_REQUEST_FAILED", email || undefined, ip);
    return NextResponse.json(genericResponse);
  }
}