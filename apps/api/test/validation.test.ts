import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RebalanceReason } from "../src/modules/reasons/reason.model";
import { Waitlist } from "../src/modules/waitlist/waitlist.model";
import { VAULT, buildApp, fakeQuery } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("input validation and injection attempts", () => {
  const app = buildApp();

  it("rejects wallet[$ne] operator injection in the query string", async () => {
    const find = vi.spyOn(Waitlist, "findOne");
    for (const qs of ["wallet[$ne]=x", "wallet[$ne]=", "wallet=a&wallet=b", "wallet[$gt]=0x"]) {
      const res = await request(app).get(`/waitlist/check?${qs}&inviteCode=ALPHA1`);
      expect(res.status).toBe(400);
    }
    expect(find).not.toHaveBeenCalled();
  });

  it("rejects operator objects in JSON bodies", async () => {
    const find = vi.spyOn(Waitlist, "findOne");
    const res = await request(app).post("/waitlist/join").send({ email: { $ne: null } });
    expect(res.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it("rejects malformed addresses in path params", async () => {
    const res = await request(app).get("/baskets/not-an-address");
    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toMatchObject({ location: "params", path: "vault" });
  });

  it("does not echo input values in validation errors", async () => {
    const res = await request(app).get("/baskets/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain("script");
  });

  it("returns 400 (no stack) for malformed JSON", async () => {
    const res = await request(app).post("/waitlist/join").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at JSON|node_modules/);
  });

  it("hides internal error details behind a generic 500", async () => {
    vi.spyOn(RebalanceReason, "find").mockReturnValue(fakeQuery(new Error("MongoServerError: secret cluster detail")));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await request(app).get(`/baskets/${VAULT}/rebalance-reasons`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "internal_error", message: "Internal server error" } });
    expect(spy).toHaveBeenCalled();
  });

  it("checks invite codes from env, not hardcoded values", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(Waitlist, "findOne").mockResolvedValue({ isVerified: false, save } as never);
    const wallet = "0x5555555555555555555555555555555555555555";
    expect((await request(app).get(`/waitlist/check?wallet=${wallet}&inviteCode=1234`)).status).toBe(400);
    const ok = await request(app).get(`/waitlist/check?wallet=${wallet}&inviteCode=ALPHA1`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ success: true, data: { isVerified: true } });
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("GET /quote", () => {
  const app = buildApp();

  it("validates inputs (integer base units only)", async () => {
    for (const amount of ["1.5", "-1", "0", "1e6", "abc"]) {
      const res = await request(app).get(`/quote?basket=${VAULT}&side=buy&amount=${amount}`);
      expect(res.status).toBe(400);
    }
    expect((await request(app).get(`/quote?basket=${VAULT}&side=short&amount=1`)).status).toBe(400);
  });

  it("returns 501 on chains where Alloy is not deployed", async () => {
    const res = await request(app).get(`/quote?chainId=8453&basket=${VAULT}&side=buy&amount=10000000`);
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe("not_deployed");
  });
});
