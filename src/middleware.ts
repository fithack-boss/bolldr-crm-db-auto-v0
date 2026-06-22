export { default } from "next-auth/middleware";

// Protect the app and admin areas — unauthenticated users are redirected to
// /login (configured via authOptions.pages). The auth and login routes are
// intentionally excluded from the matcher.
export const config = {
  matcher: ["/dashboard/:path*", "/contacts/:path*", "/daily-log/:path*", "/admin/:path*"],
};
