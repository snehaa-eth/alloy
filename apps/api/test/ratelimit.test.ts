import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./helpers";

describe("rate limiting", () => {
  it("applies a global per-IP limit", async () => {
    const app = buildApp({ rateLimits: { windowMs: 60_000, globalMax: 3, writeMax: 100, waitlistMax: 100 } });
    for (let i = 0; i < 3; i++) expect((await request(app).get("/health")).status).toBe(200);
    const res = await request(app).get("/health");
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("rate_limited");
  });

  it("applies a stricter limit to waitlist endpoints (invite-code brute force)", async () => {
    const app = buildApp({ rateLimits: { windowMs: 60_000, globalMax: 100, writeMax: 100, waitlistMax: 2 } });
    const url = "/waitlist/check?wallet=bad";
    expect((await request(app).get(url)).status).toBe(400);
    expect((await request(app).get(url)).status).toBe(400);
    expect((await request(app).get(url)).status).toBe(429);
    // other routes are unaffected
    expect((await request(app).get("/health")).status).toBe(200);
  });
});
