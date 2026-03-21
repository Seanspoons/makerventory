import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again shortly.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeIp(value: string | null | undefined) {
  if (!value) return "unknown";
  return value.split(",")[0]?.trim() || "unknown";
}

export async function getClientIdentifier() {
  const store = await headers();
  return normalizeIp(store.get("x-forwarded-for") ?? store.get("x-real-ip"));
}

export function getClientIdentifierFromRequestLike(
  headersLike: Headers | Record<string, string | string[] | undefined> | undefined,
) {
  if (!headersLike) {
    return "unknown";
  }

  if (headersLike instanceof Headers) {
    return normalizeIp(headersLike.get("x-forwarded-for") ?? headersLike.get("x-real-ip"));
  }

  const forwarded = headersLike["x-forwarded-for"];
  const realIp = headersLike["x-real-ip"];
  const candidate = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded ?? (Array.isArray(realIp) ? realIp[0] : realIp);

  return normalizeIp(candidate ?? null);
}

export async function assertRateLimit(args: {
  action: string;
  identifier: string;
  limit: number;
  windowMinutes: number;
}) {
  const windowMs = args.windowMinutes * 60 * 1000;
  const now = Date.now();
  const bucketStart = new Date(Math.floor(now / windowMs) * windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      action_identifier_bucketStart: {
        action: args.action,
        identifier: args.identifier,
        bucketStart,
      },
    },
    create: {
      action: args.action,
      identifier: args.identifier,
      bucketStart,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });

  if (bucket.count > args.limit) {
    throw new RateLimitError();
  }
}
