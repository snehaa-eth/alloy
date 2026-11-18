import { rateLimit, type Options } from "express-rate-limit";

export type RateLimitConfig = {
  windowMs: number;
  /** All requests, per IP per window. */
  globalMax: number;
  /** Authenticated writes, per IP per window. */
  writeMax: number;
  /** Waitlist join/check (invite-code brute force), per IP per window. */
  waitlistMax: number;
};

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  windowMs: 60_000,
  globalMax: 300,
  writeMax: 30,
  waitlistMax: 10,
};

// NOTE: the default store is in-memory, i.e. per serverless instance.
// TODO: move to a shared store (Upstash Redis / Vercel KV) or the Vercel Firewall for real limits.
function limiter(windowMs: number, limit: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "rate_limited", message: "Too many requests, slow down." } },
    ...extra,
  });
}

export function createLimiters(cfg: RateLimitConfig) {
  return {
    global: limiter(cfg.windowMs, cfg.globalMax),
    write: limiter(cfg.windowMs, cfg.writeMax),
    waitlist: limiter(cfg.windowMs, cfg.waitlistMax),
  };
}
