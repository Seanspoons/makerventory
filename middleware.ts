import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) =>
      Boolean(token?.sub && token.workspaceId && !token.sessionRevoked),
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|api/password-reset|api/import-templates|sign-in|sign-up|forgot-password|reset-password|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
