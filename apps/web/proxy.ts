/**
 * Early-access gate, set by WAITLIST_MODE:
 * - "on":     every page redirects to /waitlist (pre-launch).
 * - "invite": pages open only with a valid signed `alloy_access` cookie (set by /api/access after a waitlisted
 *             email signs in); everyone else goes to /waitlist.
 * - unset / "off": open (local dev).
 * Never redirected: /waitlist, Next internals, API routes, and any file with an extension (icons, images, .riv…).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessCookie } from "@/lib/access/cookie";

function toWaitlist(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/waitlist";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export async function proxy(request: NextRequest) {
  const mode = process.env.WAITLIST_MODE;
  if (mode === "on") return toWaitlist(request);
  if (mode === "invite") {
    const ok = await verifyAccessCookie(request.cookies.get(ACCESS_COOKIE)?.value, process.env.ACCESS_COOKIE_SECRET);
    return ok ? NextResponse.next() : toWaitlist(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/|waitlist|favicon\\.ico|icon\\.svg|apple-icon|opengraph-image|twitter-image|robots\\.txt|sitemap\\.xml|.*\\.[A-Za-z0-9]+$).*)"],
};
