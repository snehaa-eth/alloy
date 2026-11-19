/**
 * Early-access cookie `alloy_access`: `<base64url payload>.<base64url HMAC-SHA256>`, payload { h: email hash, exp }.
 * Web Crypto only, so it runs in proxy.ts as well as in route handlers. Secret: ACCESS_COOKIE_SECRET (server only).
 */
export const ACCESS_COOKIE = "alloy_access";
export const ACCESS_TTL_S = 30 * 24 * 60 * 60;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function emailHash(email: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(email.trim().toLowerCase())));
  return b64url(d).slice(0, 22);
}

export async function signAccessCookie(email: string, secret: string, now = Date.now()): Promise<string> {
  const payload = enc.encode(JSON.stringify({ h: await emailHash(email), exp: Math.floor(now / 1000) + ACCESS_TTL_S }));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), payload));
  return `${b64url(payload)}.${b64url(sig)}`;
}

/** True only for an untampered, unexpired cookie. HMAC verify is constant-time. */
export async function verifyAccessCookie(value: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value || !secret || value.length > 512) return false;
  const [p, s, extra] = value.split(".");
  if (!p || !s || extra !== undefined) return false;
  const payload = fromB64url(p);
  const sig = fromB64url(s);
  if (!payload || !sig) return false;
  try {
    if (!(await crypto.subtle.verify("HMAC", await key(secret), sig, payload))) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(payload)) as { exp?: unknown };
    return typeof exp === "number" && exp * 1000 > now;
  } catch {
    return false;
  }
}
