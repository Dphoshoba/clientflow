import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

function signatureIsValid(body: string, header: string, secret: string) {
  const fields = header.split(",").map((part) => part.split("=", 2));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return signatures.some((candidate) => {
    const actual = Buffer.from(candidate, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Stripe signature is required" } }, { status: 400 });

  const body = await request.text();
  if (!signatureIsValid(body, signature, secret)) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Stripe signature is invalid" } }, { status: 400 });
  }

  let event: StripeEvent;
  try { event = JSON.parse(body) as StripeEvent; }
  catch { return NextResponse.json({ error: { code: "INVALID_EVENT", message: "Webhook body is invalid JSON" } }, { status: 400 }); }

  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    const metadata = object.metadata as Record<string, string> | null;
    const organizationId = metadata?.organizationId;
    const planType = metadata?.planType;
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
    if (!organizationId || !planType || !subscriptionId) {
      return NextResponse.json({ error: { code: "MISSING_METADATA", message: "Checkout session is missing subscription metadata" } }, { status: 400 });
    }
    await prisma.planSubscription.upsert({
      where: { organizationId },
      update: { stripeId: subscriptionId, planType, status: "active" },
      create: { organizationId, stripeId: subscriptionId, planType, status: "active" },
    });
  } else if (event.type === "customer.subscription.deleted") {
    const subscriptionId = object.id;
    if (typeof subscriptionId === "string") {
      await prisma.planSubscription.updateMany({ where: { stripeId: subscriptionId }, data: { status: "canceled" } });
    }
  }

  return NextResponse.json({ received: true });
}