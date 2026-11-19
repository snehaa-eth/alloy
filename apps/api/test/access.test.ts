import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthVerifier } from "../src/lib/auth";
import { Settings } from "../src/modules/access/settings.model";
import { Waitlist } from "../src/modules/waitlist/waitlist.model";
import { buildApp, fakeQuery, testEnv } from "./helpers";

afterEach(() => vi.restoreAllMocks());

const ADMIN_KEY = "k".repeat(32);

/** Mock Privy: token -> verified emails. */
const privy: AuthVerifier = {
  async verify(token) {
    const emails: Record<string, string[]> = {
      listed: ["listed@alloy.test"],
      google: ["Judge@Gmail.com"],
      stranger: ["new@alloy.test"],
      wallet: [],
    };
    if (!(token in emails)) throw new Error("invalid token");
    return { userId: `did:privy:${token}`, wallets: [], emails: emails[token]!.map((e) => e.toLowerCase()) };
  },
};

const app = buildApp({ auth: privy, env: testEnv({ ADMIN_KEY }) });

describe("POST /access/check", () => {
  it("401 without or with a bad Privy token", async () => {
    expect((await request(app).post("/access/check")).status).toBe(401);
    expect((await request(app).post("/access/check").set("Authorization", "Bearer forged")).status).toBe(401);
  });

  it("allows a waitlisted email at any place in line", async () => {
    const find = vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery({ _id: "a", email: "listed@alloy.test", createdAt: new Date() }));
    vi.spyOn(Waitlist, "countDocuments").mockReturnValue(fakeQuery(812));
    const res = await request(app).post("/access/check").set("Authorization", "Bearer listed");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ allowed: true, email: "listed@alloy.test", onList: true, position: 812 });
    expect(JSON.stringify(find.mock.calls[0]![0])).toContain("listed@alloy.test");
  });

  it("allows an allow-listed email (case-insensitive) that is not on the waitlist", async () => {
    vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery(null));
    vi.spyOn(Settings, "findOne").mockReturnValue(fakeQuery({ key: "access", allow: ["judge@gmail.com"] }));
    const res = await request(app).post("/access/check").set("Authorization", "Bearer google");
    expect(res.body).toEqual({ allowed: true, email: "judge@gmail.com", onList: false, position: null });
  });

  it("refuses an email that is on neither list", async () => {
    vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery(null));
    vi.spyOn(Settings, "findOne").mockReturnValue(fakeQuery(null));
    const res = await request(app).post("/access/check").set("Authorization", "Bearer stranger");
    expect(res.body).toEqual({ allowed: false, email: "new@alloy.test", onList: false, position: null, reason: "not-on-list" });
  });

  it("asks wallet-only users for an email without touching the DB", async () => {
    const find = vi.spyOn(Waitlist, "findOne");
    const res = await request(app).post("/access/check").set("Authorization", "Bearer wallet");
    expect(res.body).toEqual({ allowed: false, reason: "email-needed", onList: false, position: null });
    expect(find).not.toHaveBeenCalled();
  });
});

describe("admin auth", () => {
  it("401 without or with a wrong x-admin-key", async () => {
    expect((await request(app).get("/admin/waitlist")).status).toBe(401);
    expect((await request(app).get("/admin/waitlist").set("x-admin-key", "nope")).status).toBe(401);
    expect((await request(app).get("/admin/waitlist").set("x-admin-key", ADMIN_KEY + "x")).status).toBe(401);
    expect((await request(app).post("/admin/access").send({ allowAdd: ["a@b.co"] })).status).toBe(401);
  });

  it("503 when ADMIN_KEY is not configured", async () => {
    const open = buildApp({ auth: privy });
    expect((await request(open).get("/admin/waitlist").set("x-admin-key", ADMIN_KEY)).status).toBe(503);
  });

  it("exports entries in sign-up order (json and csv)", async () => {
    const t = new Date("2026-11-19T10:00:00Z");
    vi.spyOn(Waitlist, "find").mockReturnValue(
      fakeQuery([
        { email: "a@b.co", xHandle: "aa", createdAt: t, source: "waitlist" },
        { email: "=evil@b.co", createdAt: t },
      ]),
    );
    const res = await request(app).get("/admin/waitlist").set("x-admin-key", ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.entries[0]).toEqual({ email: "a@b.co", xHandle: "aa", position: 1, createdAt: t.toISOString(), source: "waitlist" });
    const csv = await request(app).get("/admin/waitlist?format=csv").set("x-admin-key", ADMIN_KEY);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text.split("\n")[2]).toBe("2,'=evil@b.co,,2026-11-19T10:00:00.000Z,");
  });

  it("edits the allow list with normalised emails and rejects bad input", async () => {
    const upd = vi.spyOn(Settings, "updateOne").mockReturnValue(fakeQuery({}));
    vi.spyOn(Settings, "findOne").mockReturnValue(fakeQuery({ key: "access", allow: ["judge@x.io"] }));
    const res = await request(app).post("/admin/access").set("x-admin-key", ADMIN_KEY).send({ allowAdd: [" Judge@X.io "] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ allow: ["judge@x.io"] });
    expect(JSON.stringify(upd.mock.calls[0])).toContain("judge@x.io");
    const bad = await request(app).post("/admin/access").set("x-admin-key", ADMIN_KEY).send({ cutoff: 5 });
    expect(bad.status).toBe(400);
  });
});
