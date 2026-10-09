import { createHash } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "magic-link",
      name: "Email link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;

        const tokenHash = createHash("sha256").update(token).digest("hex");
        const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
        const now = new Date();
        if (!record || record.usedAt || record.expiresAt <= now) return null;

        const consumed = await prisma.magicLinkToken.updateMany({
          where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        if (consumed.count !== 1) return null;

        const user = await prisma.user.findUnique({ where: { email: record.email } });
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};