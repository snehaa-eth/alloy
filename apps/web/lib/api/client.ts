/**
 * Minimal typed fetch wrapper for apps/api.
 * - Writes (and authenticated reads) carry the Privy access token as a Bearer JWT;
 *   the API verifies it server-side (ARCHITECTURE §4 "Auth").
 * - Responses are validated with zod; amounts arrive as decimal strings -> bigint.
 * - The client never sends holdings/amount bookkeeping to the API: the chain is the
 *   source of truth.
 */
import { z } from "zod";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v2").replace(/\/$/, "");
/** False when NEXT_PUBLIC_API_URL is unset: callers skip the API and use on-chain fallbacks. */
export const API_CONFIGURED = !!process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  signal?: AbortSignal;
  /** Abort after this many ms (default 8000). */
  timeoutMs?: number;
  /** Next.js fetch cache options for server components. */
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function apiFetch<T>(path: string, opts: FetchOptions<T>): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body, bigintReplacer),
    signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 8_000),
    next: opts.next,
  });

  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON error body
  }
  if (!res.ok) {
    const apiMsg =
      json !== null && typeof json === "object" && "error" in json ? String((json as { error: unknown }).error) : "";
    const msg = apiMsg || `API ${res.status} on ${path}`;
    throw new ApiError(msg, res.status, json ?? text);
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(`Unexpected API response for ${path}: ${parsed.error.message}`, res.status, json);
  }
  return parsed.data;
}

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}
