/**
 * Waitlist mode. With WAITLIST_MODE=on (Vercel production), every page redirects to /waitlist.
 * Unset (local dev) = the app works normally. Turn the flag off to open the app.
 * Never redirected: /waitlist, Next internals, API routes, and any file with an extension (icons, images, .riv…).
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.WAITLIST_MODE !== "on") return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/waitlist";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!api/|_next/|waitlist|favicon\\.ico|icon\\.svg|apple-icon|opengraph-image|twitter-image|robots\\.txt|sitemap\\.xml|.*\\.[A-Za-z0-9]+$).*)"],
};
