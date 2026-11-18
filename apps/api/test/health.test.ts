import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./helpers";

describe("health + app shell", () => {
  const app = buildApp();

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", service: "alloy-api", chains: [8453, 84532] });
  });

  it("is also mounted under the legacy /api/v1 prefix", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("unknown routes return JSON 404", async () => {
    const res = await request(app).get("/user/fund-wallet-from-treasury");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
    const post = await request(app).post("/api/v1/user/fund-wallet-from-treasury").send({});
    expect(post.status).toBe(404);
  });

  it("CORS allows configured origins only", async () => {
    const ok = await request(app).get("/health").set("Origin", "https://crates-ui.vercel.app");
    expect(ok.headers["access-control-allow-origin"]).toBe("https://crates-ui.vercel.app");
    const bad = await request(app).get("/health").set("Origin", "https://evil.example");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not advertise express", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
