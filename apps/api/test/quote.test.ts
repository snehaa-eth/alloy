import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { DEMO, DEP, S, USDC, mockChain, revert } from "./chainMock";
import { buildApp } from "./helpers";

const G = S.tGOOGLc;
const M = S.tMSFTc;
const T = S.tTSLAc;
const comps = [G.token, M.token, T.token];
const round = (px: bigint) => [1n, px, 0n, 1_795_000_000n, 1n];

function chain(over: Record<string, unknown> = {}) {
  return mockChain({
    isBasket: (_: unknown, [b]: readonly unknown[]) => (b as string).toLowerCase() === DEMO.toLowerCase(),
    components: comps,
    [`latestRoundData@${G.feed.toLowerCase()}`]: round(285_00000000n), // $285
    [`latestRoundData@${M.feed.toLowerCase()}`]: round(500_00000000n), // $500
    [`latestRoundData@${T.feed.toLowerCase()}`]: round(400_00000000n), // $400
    splitUsdc: [4_000_000n, 3_000_000n, 3_000_000n],
    // $4 -> 0.01400000 GOOGL (oracle 0.01403508), $3 -> 0.00599000 MSFT, $3 -> 0.00749000 TSLA
    quoteExactInputSingle: (_: unknown, [p]: readonly unknown[]) => {
      const { tokenIn, tokenOut, amountIn } = p as { tokenIn: string; tokenOut: string; amountIn: bigint };
      if (tokenIn.toLowerCase() === USDC.toLowerCase()) {
        const out = { [G.token]: 1_400_000n, [M.token]: 599_000n, [T.token]: 749_000n }[tokenOut as string];
        return [out, 0n, 1, 80_000n];
      }
      return [(amountIn * 99n) / 100n, 0n, 1, 80_000n]; // sell legs: dummy 1:0.99 in raw units
    },
    sharesFor: [9_980_000_000_000_000_000n, [1_400_000n, 598_990n, 749_000n]],
    previewRedeem: [700_000n, 300_000n, 370_000n],
    ...over,
  });
}

describe("GET /quote (Base Sepolia, mocked chain)", () => {
  it("buy: splitUsdc -> QuoterV2 per leg -> sharesFor, with slippage-adjusted minOuts and cost", async () => {
    const c = chain();
    const app = buildApp({ chain: c });
    const res = await request(app).get(`/quote?chainId=84532&basket=${DEMO}&side=buy&amount=10000000`);
    expect(res.status).toBe(200);
    const q = res.body.data;
    expect(q).toMatchObject({ side: "buy", amount: "10000000", slippageBps: 100, expectedResult: "9980000000000000000" });
    expect(q.minResult).toBe("9880200000000000000"); // -1%
    expect(q.legs.map((l: { symbol: string }) => l.symbol)).toEqual(["tGOOGLc", "tMSFTc", "tTSLAc"]);
    expect(q.legs[0]).toMatchObject({ amountIn: "4000000", expectedOut: "1400000", minOut: "1386000", leftover: "0", poolFeeBps: 5 });
    expect(q.legs[1]).toMatchObject({ used: "598990", leftover: "10" });
    // value received at oracle: 3.99 + 2.995 + 2.996 = 9.981 -> cost $0.019 = 19 bps; pool fee 5 bps = $0.005
    expect(q.cost).toEqual({ totalUsdc: "19000", poolFeeUsdc: "5000", impactUsdc: "14000", bps: 19 });
    expect(q.tx).toEqual({
      to: DEP.contracts.router,
      functionName: "buy",
      args: [DEMO, "10000000", ["1386000", "593010", "741510"], "9880200000000000000"],
    });
    expect(q.approval).toMatchObject({ token: USDC, spender: DEP.contracts.router, amount: "10000000" });
    expect(Date.parse(q.expiresAt) - Date.parse(q.quotedAt)).toBe(30_000);
  });

  it("caches identical quotes for 10s", async () => {
    const c = chain();
    const app = buildApp({ chain: c });
    const url = `/quote?chainId=84532&basket=${DEMO}&side=buy&amount=10000000&slippageBps=50`;
    await request(app).get(url);
    const n = c.calls.length;
    const again = await request(app).get(url);
    expect(again.status).toBe(200);
    expect(again.body.data.minResult).toBe("9930100000000000000");
    expect(c.calls.length).toBe(n);
  });

  it("sell: previewRedeem -> QuoterV2 per leg to tUSDC", async () => {
    const app = buildApp({ chain: chain() });
    const res = await request(app).get(`/quote?chainId=84532&basket=${DEMO}&side=sell&amount=5000000000000000000`);
    expect(res.status).toBe(200);
    const q = res.body.data;
    expect(q.legs.map((l: { amountIn: string }) => l.amountIn)).toEqual(["700000", "300000", "370000"]);
    expect(q.expectedResult).toBe(String(693_000 + 297_000 + 366_300));
    expect(q.tx.functionName).toBe("sell");
    expect(q.approval).toBeNull();
  });

  it("404s for addresses that are not Alloy baskets", async () => {
    const app = buildApp({ chain: chain() });
    const res = await request(app).get(`/quote?chainId=84532&basket=0x${"44".repeat(20)}&side=buy&amount=10000000`);
    expect(res.status).toBe(404);
  });

  it("maps contract reverts to 422 and RPC failures to a generic 502", async () => {
    const reverting = buildApp({ chain: chain({ splitUsdc: revert("BasketEmpty") }) });
    const r1 = await request(reverting).get(`/quote?chainId=84532&basket=${DEMO}&side=buy&amount=10000000`);
    expect(r1.status).toBe(422);
    expect(r1.body.error.message).toContain("BasketEmpty");

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const down = buildApp({ chain: chain({ components: new Error("fetch failed https://rpc.secret/key") }) });
    const r2 = await request(down).get(`/quote?chainId=84532&basket=${DEMO}&side=buy&amount=10000000`);
    expect(r2.status).toBe(502);
    expect(JSON.stringify(r2.body)).not.toContain("secret");
  });
});
