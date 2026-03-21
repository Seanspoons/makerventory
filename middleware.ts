import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) =>
      Boolean(token?.sub && token.workspaceId && !token.sessionRevoked),
  },
});

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
