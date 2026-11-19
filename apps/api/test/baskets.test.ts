import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { DEMO, DEP, S, mockChain } from "./chainMock";
import { buildApp } from "./helpers";

const comps = [S.tGOOGLc.token, S.tMSFTc.token, S.tTSLAc.token];
const ALICE = "0x000000000000000000000000000000000000a11c";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const ZERO = "0x0000000000000000000000000000000000000000";

function chain(logs: Array<{ from: string; to: string; value: bigint }> = []) {
  return mockChain(
    {
      basketCount: 1n,
      allBaskets: DEMO,
      isBasket: (_: unknown, [b]: readonly unknown[]) => (b as string).toLowerCase() === DEMO.toLowerCase(),
      name: "Alloy Demo: Big Tech",
      symbol: "aDEMO",
      creator: DEP.contracts.deployer,
      feeBps: 100,
      absBandBps: 500,
      relBandBps: 2500,
      capBps: 4000,
      notice: 600n,
      demo: true,
      targets: [4000, 3000, 3000],
      getBundle: [comps, [1_400_000n, 600_000n, 750_000n]],
      componentValues: [4_000_000_000n, 3_000_000_000n, 3_000_000_000n],
      nav: 10_000_000_000n,
      navPerShare: 99_930_480n,
      totalSupply: 100_000_000_000_000_000_000n,
      pendingRecipe: [[5000, 2500, 2500], 1_795_100_000n, `0x${"ab".repeat(32)}`],
      nextTrimAt: 0n,
      lossBudgetUsed: 0n,
      tvlCapOf: 0n,
    },
    {
      getBlockNumber: async () => BigInt(DEP.contracts.deployedAtBlock) + 50n,
      getLogs: async () => logs.map((args) => ({ address: DEMO as Address, args })),
    },
  );
}

describe("GET /baskets (on-chain + metadata)", () => {
  it("lists factory baskets with live state merged with Mongo metadata", async () => {
    const meta = new Map([[DEMO.toLowerCase(), { thesis: "t", imageUrl: "/brand/covers/big-tech.webp", tags: ["demo"] }]]);
    const app = buildApp({ chain: chain(), basketMeta: { byChain: async () => meta as never } });
    const res = await request(app).get("/baskets?chainId=84532");
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 1, metadata: "ok" });
    const b = res.body.data[0];
    expect(b).toMatchObject({
      vault: DEMO,
      name: "Alloy Demo: Big Tech",
      feeBps: 100,
      mode: { absBandBps: 500, relBandBps: 2500, capBps: 4000, noticeSeconds: 600, demo: true },
      nav: "10000000000",
      navPerShare: "99930480",
      nextTrimAt: null,
      meta: { thesis: "t", tags: ["demo"] },
    });
    expect(b.components[0]).toMatchObject({ symbol: "tGOOGLc", underlying: "GOOGL", targetBps: 4000, weightBps: 4000 });
    expect(b.pendingRecipe).toMatchObject({ targetBps: [5000, 2500, 2500] });

    expect((await request(app).get("/baskets?chainId=84532&tag=space")).body.data).toEqual([]);
  });

  it("still serves on-chain data when Mongo is unavailable", async () => {
    const app = buildApp({ chain: chain(), basketMeta: { byChain: async () => null } });
    const res = await request(app).get(`/baskets/${DEMO}?chainId=84532`);
    expect(res.status).toBe(200);
    expect(res.body.data.meta).toBeNull();
    expect(res.body.meta.metadata).toBe("unavailable");
  });

  it("404s for non-baskets", async () => {
    const res = await request(buildApp({ chain: chain() })).get(`/baskets/0x${"44".repeat(20)}?chainId=84532`);
    expect(res.status).toBe(404);
  });

  it("counts followers from Transfer logs once the scan catches up (dead shares excluded)", async () => {
    const app = buildApp({
      chain: chain([
        { from: ZERO, to: DEAD, value: 1n },
        { from: ZERO, to: DEP.contracts.deployer, value: 10n },
        { from: DEP.contracts.deployer, to: ALICE, value: 4n },
        { from: ZERO, to: "0x000000000000000000000000000000000000b0b0", value: 5n },
        { from: "0x000000000000000000000000000000000000b0b0", to: ZERO, value: 5n }, // fully exited
      ]),
    });
    const first = await request(app).get("/baskets?chainId=84532");
    expect(first.body.data[0].followers).toBeNull(); // scan started in the background
    await new Promise((r) => setTimeout(r, 20));
    const second = await request(app).get("/baskets?chainId=84532");
    expect(second.body.data[0].followers).toBe(2); // deployer + alice
  });
});
