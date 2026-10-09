import { createHmac, timingSafeEqual } from "node:crypto";

type PortalClaims = {
  clientContactId: string;
  projectId: string;
  exp: number;
};

function secret() {
  const value = process.env.PORTAL_SECRET;
  if (!value) throw new Error("PORTAL_SECRET is not configured");
  return value;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(input: string) {
  return createHmac("sha256", secret()).update(input).digest("base64url");
}

export function createPortalToken(clientContactId: string, projectId: string, lifetimeSeconds = 60 * 60 * 24 * 14) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ clientContactId, projectId, exp: Math.floor(Date.now() / 1000) + lifetimeSeconds });
  const input = `${header}.${payload}`;
  return `${input}.${signature(input)}`;
}

export function inspectPortalToken(token: string): { claims: PortalClaims; expired: boolean } | null {
  try {
    const [header, payload, suppliedSignature, extra] = token.split(".");
    if (!header || !payload || !suppliedSignature || extra) return null;
    const input = `${header}.${payload}`;
    const expected = Buffer.from(signature(input));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

    const parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: string };
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PortalClaims;
    if (parsedHeader.alg !== "HS256" || !claims.clientContactId || !claims.projectId || !Number.isInteger(claims.exp)) return null;
    return { claims, expired: claims.exp <= Math.floor(Date.now() / 1000) };
  } catch {
    return null;
  }
}

export function verifyPortalToken(token: string) {
  const inspected = inspectPortalToken(token);
  return inspected && !inspected.expired ? inspected.claims : null;
}