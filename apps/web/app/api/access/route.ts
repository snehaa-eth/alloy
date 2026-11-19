/**
 * POST /api/access: the waitlist page sends the Privy access token (Authorization: Bearer). We ask the API
 * (POST /access/check, server-side) whether the user's verified email is on the waitlist / allow list, and if so
 * set the signed `alloy_access` cookie that proxy.ts checks in WAITLIST_MODE=invite.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, ACCESS_TTL_S, signAccessCookie } from "@/lib/access/cookie";

export const dynamic = "force-dynamic";

const API = (process.env.ACCESS_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

type Check =
  | { allowed: true; email: string; onList: boolean; position: number | null }
  | { allowed: false; reason: "not-on-list" | "email-needed"; email?: string };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const secret = process.env.ACCESS_COOKIE_SECRET;
  if (!secret || secret.length < 32) return json({ error: "Access isn't configured yet." }, 503);

  const auth = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S{20,4096})$/i.exec(auth)?.[1];
  if (!token) return json({ error: "Sign in first." }, 401);

  let check: Check;
  try {
    const res = await fetch(`${API}/access/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 401) return json({ error: "Your sign-in expired. Try again." }, 401);
    if (res.status === 429) return json({ error: "Too many tries. Give it a minute." }, 429);
    if (!res.ok) return json({ error: "Couldn't check right now. Try again in a moment." }, 502);
    check = (await res.json()) as Check;
  } catch {
    return json({ error: "Couldn't reach us. Try again in a moment." }, 502);
  }

  if (!check.allowed) return json({ allowed: false, reason: check.reason, ...(check.email ? { email: check.email } : {}) });

  const out = json({ allowed: true });
  out.cookies.set(ACCESS_COOKIE, await signAccessCookie(check.email, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_S,
  });
  return out;
}
