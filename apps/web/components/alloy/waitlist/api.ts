/** Waitlist sign-up against apps/api (POST /waitlist). */
import { API_BASE_URL } from "@/lib/api/client";

export type JoinResult = { ok: true; position: number | null; already: boolean } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

export const cleanHandle = (h: string) => h.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");

/** Client-side check (the API validates again). Returns an error line or null. */
export function checkInput(email: string, handle: string): { field: "email" | "handle"; msg: string } | null {
  const e = email.trim();
  if (!e) return { field: "email", msg: "Add your email." };
  if (e.length > 254 || !EMAIL.test(e)) return { field: "email", msg: "That email doesn't look right." };
  const h = cleanHandle(handle);
  if (h && !HANDLE.test(h)) return { field: "handle", msg: "X handles are letters, numbers and _ (max 15)." };
  return null;
}

export async function joinWaitlist(email: string, handle: string): Promise<JoinResult> {
  const h = cleanHandle(handle);
  let referrer: string | undefined;
  try {
    referrer = document.referrer ? document.referrer.slice(0, 500) : undefined;
  } catch {
    referrer = undefined;
  }
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const source = (params?.get("ref") || params?.get("utm_source") || "waitlist").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "waitlist";
  try {
    const res = await fetch(`${API_BASE_URL}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email.trim(), ...(h ? { xHandle: h } : {}), source, ...(referrer ? { referrer } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { position?: number; alreadyJoined?: boolean } } | null;
    if (res.status === 429) return { ok: false, error: "Too many tries. Give it a minute." };
    if (res.status === 400) return { ok: false, error: "That email doesn't look right." };
    if (!res.ok) return { ok: false, error: "Couldn't save that. Try again in a moment." };
    const pos = json?.data?.position;
    return { ok: true, position: typeof pos === "number" && pos > 0 ? pos : null, already: Boolean(json?.data?.alreadyJoined) };
  } catch {
    return { ok: false, error: "Couldn't reach us. Check your connection and try again." };
  }
}
