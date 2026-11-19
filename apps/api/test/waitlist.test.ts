import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Waitlist } from "../src/modules/waitlist/waitlist.model";
import { buildApp, fakeQuery } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("POST /waitlist", () => {
  const app = buildApp();

  it("creates a sign-up with email, X handle, source and referrer, and returns the place in line", async () => {
    vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery(null));
    const create = vi.spyOn(Waitlist, "create").mockResolvedValue({ createdAt: new Date() } as never);
    vi.spyOn(Waitlist, "countDocuments").mockReturnValue(fakeQuery(42));
    const res = await request(app)
      .post("/waitlist")
      .send({ email: "  Someone@Example.com ", xHandle: "@some_one", source: "waitlist", referrer: "https://x.com/" });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ position: 42, alreadyJoined: false });
    expect(create).toHaveBeenCalledWith({ email: "someone@example.com", xHandle: "some_one", source: "waitlist", referrer: "https://x.com/" });
  });

  it("dedupes by email: returns the existing place and fills a missing X handle", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const existing = { email: "a@b.co", createdAt: new Date(), xHandle: undefined as string | undefined, save };
    vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery(existing));
    const create = vi.spyOn(Waitlist, "create");
    vi.spyOn(Waitlist, "countDocuments").mockReturnValue(fakeQuery(7));
    const res = await request(app).post("/waitlist").send({ email: "a@b.co", xHandle: "abc" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ position: 7, alreadyJoined: true });
    expect(create).not.toHaveBeenCalled();
    expect(existing.xHandle).toBe("abc");
    expect(save).toHaveBeenCalled();
  });

  it("rejects bad input before touching the DB", async () => {
    const find = vi.spyOn(Waitlist, "findOne");
    for (const body of [
      {},
      { email: "nope" },
      { email: "a@b.co", xHandle: "has space" },
      { email: "a@b.co", xHandle: "way_too_long_handle_123" },
      { email: { $ne: null } },
      { email: "a@b.co", extra: 1 },
    ]) {
      const res = await request(app).post("/waitlist").send(body);
      expect(res.status).toBe(400);
    }
    expect(find).not.toHaveBeenCalled();
  });

  it("accepts an empty X handle as none", async () => {
    vi.spyOn(Waitlist, "findOne").mockReturnValue(fakeQuery(null));
    const create = vi.spyOn(Waitlist, "create").mockResolvedValue({ createdAt: new Date() } as never);
    vi.spyOn(Waitlist, "countDocuments").mockReturnValue(fakeQuery(1));
    const res = await request(app).post("/waitlist").send({ email: "x@y.io", xHandle: "" });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ email: "x@y.io", source: "waitlist" });
  });
});
