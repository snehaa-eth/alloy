import { describe, expect, it } from "vitest";
import { buildBuyQuote, buildSellQuote, DUST_USDC } from "./quote";

const A = "0x0000000000000000000000000000000000000001" as const;
const B = "0x0000000000000000000000000000000000000002" as const;
const BASKET = "0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c" as const;
const px = (d: number) => BigInt(d) * 10n ** 8n;
const comps = [
  { token: A, symbol: "tGOOGLc", price8: px(250) },
  { token: B, symbol: "tMSFTc", price8: px(500) },
];
const E18 = 10n ** 18n;

describe("buildBuyQuote", () => {
  const base = {
    basket: BASKET,
    usdcIn: 10_000_000n, // $10
    comps,
    slices: [6_000_000n, 4_000_000n],
    got: [2_390_000n, 796_000n], // 0.0239 GOOGL ($5.975), 0.00796 MSFT ($3.98)
    shares: 9_950_000_000_000_000_000n, // 9.95 shares
    used: [2_390_000n, 796_000n],
    totalSupply: 100n * E18,
    pendingFee: 0n,
    navPerShare8: 100_000_000n, // $1.00
    slippageBps: 100,
    marketOpen: true,
    now: 1,
  };

  it("applies slippage per leg and to minShares (floor)", () => {
    const q = buildBuyQuote(base);
    expect(q.expectedOut).toBe(9_950_000_000_000_000_000n);
    expect(q.minResult).toBe(9_850_500_000_000_000_000n);
    expect(q.legs.map((l) => l.minOut)).toEqual([2_366_100n, 788_040n]);
    expect(q.minOuts).toEqual(base.got);
    expect(q.legs[0].amountIn).toBe(6_000_000n);
  });

  it("values shares at navPerShare and reports cost in bps", () => {
    const q = buildBuyQuote(base);
    expect(q.oracleValueUsd6).toBe(9_950_000n); // 9.95 shares * $1
    expect(q.priceImpactBps).toBe(50); // paid $10, got $9.95
  });

  it("splits leftovers into refund (>= $0.05) and dust", () => {
    const q = buildBuyQuote({ ...base, got: [2_400_000n, 1_000_000n], used: [2_390_000n, 796_000n] });
    // GOOGL left 10_000 (8dp) * $250 = $0.025 -> dust; MSFT left 204_000 * $500 = $1.02 -> refund
    expect(q.dustUsd6).toBe(25_000n);
    expect(q.dustUsd6 < DUST_USDC).toBe(true);
    expect(q.refundUsd6).toBe(1_020_000n);
  });

  it("does not re-scale shares for pending fee (sharesFor already accounts) but lowers per-share value", () => {
    const q = buildBuyQuote({ ...base, pendingFee: E18 }); // supply grows 1%
    expect(q.expectedOut).toBe(base.shares);
    expect(q.oracleValueUsd6).toBe(9_851_485n); // 9.95 * 1/1.01
  });

  it("rejects mismatched legs", () => {
    expect(() => buildBuyQuote({ ...base, got: [1n] })).toThrow(/mismatch/);
  });
});

describe("buildSellQuote", () => {
  const base = {
    basket: BASKET,
    shares: 5n * E18,
    comps,
    amounts: [1_200_000n, 400_000n], // $3 + $2 at oracle
    usdcOuts: [2_990_000n, 1_995_000n],
    navPerShare8: 100_000_000n,
    slippageBps: 50,
    marketOpen: false,
    now: 1,
  };

  it("sums legs and sets minUsdc = sum of per-leg mins", () => {
    const q = buildSellQuote(base);
    expect(q.expectedOut).toBe(4_985_000n);
    expect(q.legs.map((l) => l.minOut)).toEqual([2_975_050n, 1_985_025n]);
    expect(q.minResult).toBe(2_975_050n + 1_985_025n);
    expect(q.oracleValueUsd6).toBe(5_000_000n);
    expect(q.priceImpactBps).toBe(30); // (5.000 - 4.985) / 5.000
    expect(q.marketOpen).toBe(false);
  });

  it("handles zero legs", () => {
    const q = buildSellQuote({ ...base, amounts: [0n, 400_000n], usdcOuts: [0n, 1_995_000n] });
    expect(q.legs[0].minOut).toBe(0n);
    expect(q.expectedOut).toBe(1_995_000n);
  });
});
