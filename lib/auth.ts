import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { logError, logInfo } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { assertRateLimit, getClientIdentifierFromRequestLike } from "@/lib/security";
import { signInSchema } from "@/lib/validation";

declare module "next-auth" {
  interface User {
    workspaceId: string;
    workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
    sessionVersion: number;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      workspaceId: string;
      workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    workspaceId?: string;
    workspaceRole?: "OWNER" | "ADMIN" | "MEMBER";
    sessionVersion?: number;
    sessionRevoked?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = signInSchema.safeParse(credentials);
        const requestId = request?.headers?.get?.("x-request-id") ?? crypto.randomUUID();
        if (!parsed.success) {
          logInfo("auth.sign_in_validation_failed", { requestId });
          return null;
        }

        const { email, password } = parsed.data;
        const clientIp = getClientIdentifierFromRequestLike(request?.headers);
        try {
          await assertRateLimit({
            action: "auth:sign-in",
            identifier: `${clientIp}:${email}`,
            limit: 8,
            windowMinutes: 10,
          });
        } catch (error) {
          logError("auth.sign_in_rate_limited", error, {
            requestId,
            emailDomain: email.split("@")[1] ?? "unknown",
          });
          throw error;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              orderBy: { createdAt: "asc" },
              include: { workspace: true },
            },
          },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          logInfo("auth.sign_in_rejected", {
            requestId,
            emailDomain: email.split("@")[1] ?? "unknown",
            reason: "missing_user_or_inactive",
          });
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid || user.memberships.length === 0) {
          logInfo("auth.sign_in_rejected", {
            requestId,
            userId: user.id,
            reason: !valid ? "invalid_password" : "missing_membership",
          });
          return null;
        }

        const activeMembership =
          user.memberships.find(
            (membership) => membership.workspaceId === user.activeWorkspaceId,
          ) ?? user.memberships[0];

        if (!activeMembership) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            activeWorkspaceId: activeMembership.workspaceId,
          },
        });

        logInfo("auth.sign_in_succeeded", {
          requestId,
          userId: user.id,
          workspaceId: activeMembership.workspaceId,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: activeMembership.workspaceId,
          workspaceRole: activeMembership.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.workspaceId = user.workspaceId;
        token.workspaceRole = user.workspaceRole;
        token.sessionVersion = user.sessionVersion;
        token.sessionRevoked = false;
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { activeWorkspaceId: true, isActive: true, sessionVersion: true },
      });

      if (!currentUser?.isActive) {
        token.sessionRevoked = true;
        return token;
      }

      if ((token.sessionVersion ?? 0) !== currentUser.sessionVersion) {
        token.sessionRevoked = true;
        token.workspaceId = undefined;
        token.workspaceRole = undefined;
        return token;
      }

      const membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: token.sub,
          workspaceId: currentUser.activeWorkspaceId ?? undefined,
        },
        orderBy: { createdAt: "asc" },
      });

      const fallbackMembership =
        membership ??
        (await prisma.workspaceMember.findFirst({
          where: { userId: token.sub },
          orderBy: { createdAt: "asc" },
        }));

      if (!fallbackMembership) {
        token.sessionRevoked = true;
        return token;
      }

      token.workspaceId = fallbackMembership.workspaceId;
      token.workspaceRole = fallbackMembership.role;
      token.sessionVersion = currentUser.sessionVersion;
      token.sessionRevoked = false;
      return token;
    },
    async session({ session, token }) {
      if (
        !session.user ||
        !token.sub ||
        !token.workspaceId ||
        !token.workspaceRole ||
        token.sessionRevoked
      ) {
        return session;
      }

      session.user.id = token.sub;
      session.user.workspaceId = token.workspaceId;
      session.user.workspaceRole = token.workspaceRole;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.workspaceId) {
    logInfo("auth.require_session_failed");
    throw new Error("Unauthorized");
  }

  return session;
}
