import { describe, expect, it } from "vitest";
import {
  equalWeightsBps,
  formatBps,
  formatUsd6,
  issueAmounts,
  maxInWithSlippage,
  minOutWithSlippage,
  mulDiv,
  mulDivUp,
  navPerShareUsd6,
  navUsd6,
  parseUsdc,
  percentToBps,
  pnl,
  redeemAmounts,
  sharesForPercent,
  sharesToUsd6,
  splitByBps,
  toWeightsBps,
  usd6ToShares,
  validateWeightsBps,
  valueUsd6,
} from "./units";

const E8 = 10n ** 8n;
const E6 = 10n ** 6n;
const E18 = 10n ** 18n;

describe("valuation", () => {
  it("usd6 = bal8 * px8 / 1e10", () => {
    // 2.5 NVDAc at $180.12345678 = $450.30864195 -> 450.308641 USDC (floor)
    expect(valueUsd6(25n * 10n ** 7n, 18_012_345_678n)).toBe(450_308_641n);
    // 1 token at $1 = 1 USDC
    expect(valueUsd6(E8, E8)).toBe(E6);
    // dust rounds down to 0
    expect(valueUsd6(1n, 1n)).toBe(0n);
  });

  it("navUsd6 sums at full precision before dividing", () => {
    const comps = [
      { balance: 1n, price: 5n * 10n ** 9n }, // 0.5 usd6 alone
      { balance: 1n, price: 5n * 10n ** 9n }, // 0.5 usd6 alone
    ];
    expect(comps.map((c) => valueUsd6(c.balance, c.price)).reduce((a, b) => a + b)).toBe(0n);
    expect(navUsd6(comps)).toBe(1n);
  });

  it("navPerShare, shares<->usdc", () => {
    const nav = 1_000n * E6; // $1000
    const ts = 100n * E18; // 100 shares
    expect(navPerShareUsd6(nav, ts)).toBe(10n * E6);
    expect(navPerShareUsd6(nav, 0n)).toBe(0n);
    expect(sharesToUsd6(25n * E18, nav, ts)).toBe(250n * E6);
    expect(usd6ToShares(250n * E6, nav, ts)).toBe(25n * E18);
    expect(usd6ToShares(1n, 0n, ts)).toBe(0n);
  });

  it("issue rounds up, redeem rounds down (round-trip never profits)", () => {
    const bals = [333n, 1_000_001n];
    const ts = 7n;
    const iss = issueAmounts(bals, 3n, ts);
    const red = redeemAmounts(bals, 3n, ts);
    iss.forEach((a, i) => expect(a >= red[i]).toBe(true));
    expect(iss).toEqual([143n, 428_572n]);
    expect(red).toEqual([142n, 428_571n]);
    expect(() => redeemAmounts(bals, 8n, ts)).toThrow();
  });

  it("mulDiv / mulDivUp", () => {
    expect(mulDiv(10n, 3n, 4n)).toBe(7n);
    expect(mulDivUp(10n, 3n, 4n)).toBe(8n);
    expect(mulDivUp(0n, 3n, 4n)).toBe(0n);
    expect(() => mulDiv(1n, 1n, 0n)).toThrow();
    expect(() => mulDiv(-1n, 1n, 1n)).toThrow();
  });
});

describe("slippage", () => {
  it("minOut floors, maxIn ceils", () => {
    expect(minOutWithSlippage(1_000_000n, 50)).toBe(995_000n);
    expect(minOutWithSlippage(999n, 50)).toBe(994n); // 994.005 -> 994
    expect(maxInWithSlippage(999n, 50)).toBe(1_004n); // 1003.995 -> 1004
    expect(minOutWithSlippage(123n, 0)).toBe(123n);
    expect(() => minOutWithSlippage(1n, 10_001)).toThrow();
    expect(() => minOutWithSlippage(1n, 0.5)).toThrow();
  });
});

describe("weights", () => {
  it("toWeightsBps sums to exactly 10_000 with largest remainder", () => {
    expect(toWeightsBps([1n, 1n, 1n])).toEqual([3334, 3333, 3333]);
    expect(toWeightsBps([2n, 1n])).toEqual([6667, 3333]);
    expect(toWeightsBps([0n, 5n])).toEqual([0, 10_000]);
    const w = toWeightsBps([123_456_789n, 987_654_321n, 555_555_555n, 1n]);
    expect(w.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(() => toWeightsBps([0n, 0n])).toThrow();
  });

  it("equalWeightsBps", () => {
    expect(equalWeightsBps(3)).toEqual([3334, 3333, 3333]);
    expect(equalWeightsBps(7).reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(equalWeightsBps(0)).toEqual([]);
  });

  it("validateWeightsBps", () => {
    expect(validateWeightsBps([4000, 3000, 3000])).toEqual({ ok: true });
    expect(validateWeightsBps([4000, 3000]).ok).toBe(false);
    expect(validateWeightsBps([10_000, 0]).ok).toBe(false);
    expect(validateWeightsBps([5000.5, 4999.5]).ok).toBe(false);
    expect(validateWeightsBps([]).ok).toBe(false);
    expect(validateWeightsBps(Array(11).fill(909)).ok).toBe(false);
  });

  it("splitByBps preserves the total", () => {
    const parts = splitByBps(1_000_001n, [3333, 3333, 3334]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(1_000_001n);
    expect(parts).toEqual([333_300n, 333_300n, 333_401n]);
  });

  it("percentToBps / formatBps", () => {
    expect(percentToBps("33.33")).toBe(3333);
    expect(percentToBps("40")).toBe(4000);
    expect(percentToBps("0.01")).toBe(1);
    expect(percentToBps("12.")).toBe(1200);
    expect(() => percentToBps("33.333")).toThrow();
    expect(() => percentToBps("101")).toThrow();
    expect(formatBps(3333)).toBe("33.33%");
    expect(formatBps(5)).toBe("0.05%");
    expect(formatBps(-125)).toBe("-1.25%");
  });
});

describe("partial sell", () => {
  it("100% sells exact balance, otherwise floors", () => {
    const bal = 3n * E18 + 1n;
    expect(sharesForPercent(bal, 10_000)).toBe(bal);
    expect(sharesForPercent(bal, 3_000)).toBe((bal * 3_000n) / 10_000n);
    expect(sharesForPercent(bal, 0)).toBe(0n);
    expect(() => sharesForPercent(bal, 10_001)).toThrow();
  });
});

describe("pnl + parsing + formatting", () => {
  it("pnl", () => {
    expect(pnl(110n * E6, 100n * E6)).toEqual({ usd6: 10n * E6, bps: 1000 });
    expect(pnl(90n * E6, 100n * E6)).toEqual({ usd6: -10n * E6, bps: -1000 });
    expect(pnl(5n, 0n)).toEqual({ usd6: 5n, bps: 0 });
  });

  it("parseUsdc", () => {
    expect(parseUsdc("10")).toBe(10n * E6);
    expect(parseUsdc("1,234.5")).toBe(1_234_500_000n);
    expect(parseUsdc("0.000001")).toBe(1n);
    expect(() => parseUsdc("0.0000001")).toThrow();
    expect(() => parseUsdc("-1")).toThrow();
    expect(() => parseUsdc("abc")).toThrow();
  });

  it("formatUsd6 truncates", () => {
    expect(formatUsd6(1_234_567_891n)).toBe("$1,234.56");
    expect(formatUsd6(-5_009_999n)).toBe("-$5.00");
    expect(formatUsd6(0n)).toBe("$0.00");
  });
});
