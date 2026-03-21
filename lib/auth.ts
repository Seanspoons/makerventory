import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

declare module "next-auth" {
  interface User {
    workspaceId: string;
    workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
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
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
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
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid || user.memberships.length === 0) {
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: activeMembership.workspaceId,
          workspaceRole: activeMembership.role,
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
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { activeWorkspaceId: true, isActive: true },
      });

      if (!currentUser?.isActive) {
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
        return token;
      }

      token.workspaceId = fallbackMembership.workspaceId;
      token.workspaceRole = fallbackMembership.role;
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub || !token.workspaceId || !token.workspaceRole) {
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
    throw new Error("Unauthorized");
  }

  return session;
}
