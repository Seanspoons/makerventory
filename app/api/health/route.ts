import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        checks: {
          app: "ok",
          database: "error",
        },
        error: error instanceof Error ? error.message : "Unknown health check failure",
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        status: 503,
        headers: {
          "x-request-id": requestId,
          "cache-control": "no-store",
        },
      },
    );
  }
}
