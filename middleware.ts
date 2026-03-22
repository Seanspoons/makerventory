import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/env";

export default withAuth(
  function middleware(request) {
    const requestHeaders = new Headers(request.headers);
    const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
    requestHeaders.set("x-request-id", requestId);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set("x-request-id", requestId);
    return response;
  },
  {
    secret: getAuthSecret(),
    callbacks: {
      authorized: ({ token }) =>
        Boolean(token?.sub && token.workspaceId && !token.sessionRevoked),
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/audit/:path*",
    "/build-plates/:path*",
    "/consumables/:path*",
    "/filament/:path*",
    "/hotends/:path*",
    "/imports/:path*",
    "/maintenance/:path*",
    "/material-systems/:path*",
    "/printers/:path*",
    "/safety/:path*",
    "/smart-plugs/:path*",
    "/tools-parts/:path*",
    "/wishlist/:path*",
  ],
};
