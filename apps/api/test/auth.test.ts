import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BasketMeta } from "../src/modules/baskets/basketMeta.model";
import { Proposal } from "../src/modules/proposals/proposal.model";
import { RebalanceReason } from "../src/modules/reasons/reason.model";
import { reasonHash } from "../src/modules/reasons/reasonHash";
import { CREATOR, SERVICE_KEY, VAULT, buildApp, fakeQuery } from "./helpers";

afterEach(() => vi.restoreAllMocks());

const metaUrl = `/baskets/${VAULT}/meta?chainId=8453`;
const body = { thesis: "AI picks and shovels", tags: ["ai", "AI", "semis"] };

describe("POST /baskets/:vault/meta auth", () => {
  const app = buildApp();

  it("401 without a token", async () => {
    const res = await request(app).post(metaUrl).send(body);
    expect(res.status).toBe(401);
  });

  it("401 with an invalid token", async () => {
    const res = await request(app).post(metaUrl).set("Authorization", "Bearer forged").send(body);
    expect(res.status).toBe(401);
  });

  it("403 when the caller is not the on-chain creator", async () => {
    const res = await request(app).post(metaUrl).set("Authorization", "Bearer stranger").send(body);
    expect(res.status).toBe(403);
  });

  it("403 when the address is not a basket", async () => {
    const res = await request(app)
      .post(`/baskets/0x4444444444444444444444444444444444444444/meta`)
      .set("Authorization", "Bearer creator")
      .send(body);
    expect(res.status).toBe(403);
  });

  it("200 for the creator, writing only whitelisted fields", async () => {
    const spy = vi.spyOn(BasketMeta, "findOneAndUpdate").mockResolvedValue({
      chainId: 8453,
      vault: VAULT,
      thesis: body.thesis,
      tags: ["ai", "semis"],
      updatedBy: CREATOR,
    } as never);
    const res = await request(app).post(metaUrl).set("Authorization", "Bearer creator").send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ vault: VAULT, tags: ["ai", "semis"], updatedBy: CREATOR });
    const [filter, update] = spy.mock.calls[0]!;
    expect(filter).toEqual({ chainId: 8453, vault: VAULT });
    expect(update).toEqual({
      $set: { updatedBy: CREATOR, thesis: body.thesis, tags: ["ai", "semis"] },
      $setOnInsert: { chainId: 8453, vault: VAULT },
    });
  });

  it("400 on mass-assignment attempts (unknown fields)", async () => {
    const res = await request(app)
      .post(metaUrl)
      .set("Authorization", "Bearer creator")
      .send({ thesis: "x", updatedBy: "0xattacker", tvl: 1e9 });
    expect(res.status).toBe(400);
  });

  it("400 for non-https image URLs", async () => {
    const res = await request(app)
      .post(metaUrl)
      .set("Authorization", "Bearer creator")
      .send({ imageUrl: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });
});

describe("rebalance reasons", () => {
  const app = buildApp();

  it("stores text with its keccak256 hash, creator only", async () => {
    const text = "Trim TSLA after two closes below the 50-day MA";
    const spy = vi.spyOn(RebalanceReason, "findOneAndUpdate").mockImplementation(((_f: unknown, u: { $setOnInsert: object }) =>
      Promise.resolve(u.$setOnInsert)) as never);
    const denied = await request(app)
      .post(`/baskets/${VAULT}/rebalance-reason`)
      .set("Authorization", "Bearer stranger")
      .send({ text });
    expect(denied.status).toBe(403);

    const res = await request(app)
      .post(`/baskets/${VAULT}/rebalance-reason`)
      .set("Authorization", "Bearer creator")
      .send({ text: `  ${text}  ` });
    expect(res.status).toBe(201);
    expect(res.body.data.reasonHash).toBe(reasonHash(text));
    expect(res.body.data.text).toBe(text);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("proposals", () => {
  const app = buildApp();
  const proposal = {
    chainId: 8453,
    vault: VAULT,
    weights: [
      { token: "0xb20000000000000000000078ee7ce2fE4908108C", bps: 6000 },
      { token: "0xb2000000000000000000001e800a7f5189430cD0", bps: 4000 },
    ],
    reason: "Rotate into NVDA",
    model: "claude",
    inputsHash: "0x" + "00".repeat(32),
  };

  it("create requires the service key", async () => {
    expect((await request(app).post("/proposals").send(proposal)).status).toBe(401);
    expect((await request(app).post("/proposals").set("Authorization", "Bearer creator").send(proposal)).status).toBe(401);
  });

  it("create validates weights sum", async () => {
    const res = await request(app)
      .post("/proposals")
      .set("Authorization", `Bearer ${SERVICE_KEY}`)
      .send({ ...proposal, weights: [{ token: proposal.weights[0]!.token, bps: 5000 }] });
    expect(res.status).toBe(400);
  });

  it("approve requires the basket creator", async () => {
    const id = "a".repeat(24);
    vi.spyOn(Proposal, "findById").mockReturnValue(fakeQuery({ _id: id, ...proposal, reasonHash: "0x", status: "pending" }));
    const upd = vi
      .spyOn(Proposal, "findOneAndUpdate")
      .mockResolvedValue({ _id: id, ...proposal, reasonHash: "0x", status: "approved", decidedBy: CREATOR } as never);

    expect((await request(app).post(`/proposals/${id}/approve`)).status).toBe(401);
    expect((await request(app).post(`/proposals/${id}/approve`).set("Authorization", "Bearer stranger")).status).toBe(403);
    expect(upd).not.toHaveBeenCalled();

    const ok = await request(app).post(`/proposals/${id}/approve`).set("Authorization", "Bearer creator");
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: "approved", decidedBy: CREATOR, disclaimer: expect.any(String) });
  });
});
