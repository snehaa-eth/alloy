import assert from "node:assert/strict";
import { test } from "node:test";
import { bandOf, isInBand, plan } from "../services/keeper/planner";
import { maxDrawdownBps, aggregatePnl } from "../lib/pnl";

const usd = (x: number) => BigInt(Math.round(x * 1e8));
const px = (x: number) => BigInt(Math.round(x * 1e8));
/** build an input from USD values and prices */
function mk(vals: number[], prices: number[], targets: number[], abs = 500, rel = 2500, cap = 10_000) {
  const values = vals.map(usd);
  const p = prices.map(px);
  const balances = values.map((v, i) => (v * 10n ** 8n) / p[i]!);
  return { values, balances, prices: p, targetBps: targets, absBandBps: abs, relBandBps: rel, capBps: cap, marginBps: 20 };
}
/** apply trades at oracle prices (perfect execution) and return weights */
function after(input: ReturnType<typeof mk>, trades: { from: number; to: number; amountIn: bigint }[]) {
  const v = input.values.map(Number);
  for (const t of trades) {
    const x = (Number(t.amountIn) * Number(input.prices[t.from]!)) / 1e8;
    v[t.from]! -= x;
    v[t.to]! += x;
  }
  const nav = v.reduce((a, b) => a + b, 0);
  return v.map((x) => x / nav);
}

test("bandOf: Balanced 5/25 and LWR disabled limbs", () => {
  assert.equal(bandOf(4000, 500, 2500), 0.05);
  assert.equal(bandOf(1500, 500, 2500), 0.0375);
  assert.equal(bandOf(4000, 10_000, 10_000), Infinity);
  assert.equal(bandOf(0, 500, 2500), 0);
});

test("Balanced: NVDA +30% in AI Build-Out 40/25/20/15 is trimmed to the band edge", () => {
  const inp = mk([520, 250, 200, 150], [195, 500, 300, 230], [4000, 2500, 2000, 1500]);
  const p = plan(inp);
  assert.equal(p.status, "trade");
  assert.deepEqual(p.outOfBand, [0]);
  assert.ok(p.trades.every((t) => t.from === 0));
  const w = after(inp, p.trades);
  assert.ok(Math.abs(w[0]! - 0.448) < 1e-6, `nvda ends at band edge minus margin, got ${w[0]}`);
  w.forEach((wi, i) => assert.ok(isInBand(wi, inp.targetBps[i]!, 500, 2500, 10_000), `comp ${i} in band`));
  w.slice(1).forEach((wi, k) => assert.ok(wi <= inp.targetBps[k + 1]! / 1e4 + 1e-9, "top-ups never cross target"));
});

test("in band -> no trade; tiny -> too-small", () => {
  assert.equal(plan(mk([440, 240, 190, 130], [1, 1, 1, 1], [4000, 2500, 2000, 1500])).status, "in-band");
  const inp = { ...mk([0.0052, 0.0025, 0.002, 0.0015], [1, 1, 1, 1], [4000, 2500, 2000, 1500]), minTradeUsd8: usd(1) };
  assert.equal(plan(inp).status, "too-small");
});

test("Let Winners Run: no drift trims, only cap", () => {
  // 80/20 vs targets 60/40, cap 70%: trim the 80% leg to just under 70%
  const inp = mk([800, 200], [400, 180], [6000, 4000], 10_000, 10_000, 7000);
  const p = plan(inp);
  assert.equal(p.status, "trade");
  const w = after(inp, p.trades);
  assert.ok(w[0]! <= 0.7 && w[0]! > 0.69);
  // big drift but under cap: nothing
  assert.equal(plan(mk([690, 310], [1, 1], [6000, 4000], 10_000, 10_000, 7000)).status, "in-band");
});

test("trend: an over-band uptrend winner blocks the trim", () => {
  const inp = { ...mk([520, 250, 200, 150], [1, 1, 1, 1], [4000, 2500, 2000, 1500]), noTrim: new Set([0]) };
  assert.equal(plan(inp).status, "blocked");
});

test("recipe change 40/25/20/15 -> 20/25/25/30 brings every component in band", () => {
  const inp = mk([400, 250, 200, 150], [195, 500, 300, 230], [2000, 2500, 2500, 3000]);
  const p = plan(inp);
  assert.equal(p.status, "trade");
  const w = after(inp, p.trades);
  w.forEach((wi, i) => assert.ok(isInBand(wi, inp.targetBps[i]!, 500, 2500, 10_000), `comp ${i}: ${wi}`));
});

test("pnl + drawdown", () => {
  assert.equal(maxDrawdownBps([100n, 120n, 90n, 130n]), 2500);
  const r = aggregatePnl([{ shares: 10n ** 18n * 100n, costUsdc6: 100_000_000n, realizedUsdc6: 5_000_000n, depositedUsdc6: 150_000_000n, withdrawnUsdc6: 55_000_000n }], 110_000_000n);
  assert.equal(r.valueUsdc6, "110000000");
  assert.equal(r.totalPnlUsdc6, "15000000");
  assert.equal(r.returnBps, 1000);
});
