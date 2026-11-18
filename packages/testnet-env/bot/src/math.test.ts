import assert from "node:assert/strict";
import { test } from "node:test";
import {
  answerFromSqrtPriceX96,
  applyChange,
  bigintSqrt,
  deviationBps,
  planSwapToTarget,
  Q96,
  sqrtPriceX96FromAnswer,
  usdToAnswer,
} from "./math.js";

test("bigintSqrt is floor sqrt", () => {
  for (const x of [0n, 1n, 2n, 3n, 4n, 15n, 16n, 17n, 10n ** 40n, (1n << 200n) + 12345n]) {
    const r = bigintSqrt(x);
    assert.ok(r * r <= x && (r + 1n) * (r + 1n) > x, `sqrt(${x})`);
  }
});

test("sqrtPrice round-trips the feed answer for both token orders", () => {
  for (const usd of ["151.36187976", "0.5", "508.465", "99999.99"]) {
    const a = usdToAnswer(usd);
    for (const s0 of [true, false]) {
      const back = answerFromSqrtPriceX96(sqrtPriceX96FromAnswer(a, s0), s0);
      assert.ok(deviationBps(back, a) < 0.01, `${usd} ${s0}: ${back} vs ${a}`);
    }
  }
});

test("stock token0 at $100 => raw price 1.0 => sqrtPriceX96 = 2^96", () => {
  assert.equal(sqrtPriceX96FromAnswer(usdToAnswer("100"), true), Q96);
  assert.equal(sqrtPriceX96FromAnswer(usdToAnswer("100"), false), Q96);
});

test("planSwapToTarget direction and size", () => {
  const L = 10n ** 12n;
  const sc = Q96;
  const up = planSwapToTarget(sc, (sc * 101n) / 100n, L, 500)!;
  assert.equal(up.zeroForOne, false);
  // dy = L * 0.01 (Q96 cancels) => 1e10, plus fee
  assert.ok(up.amountIn > 10n ** 10n && up.amountIn < (10n ** 10n * 1003n) / 1000n);
  const down = planSwapToTarget(sc, (sc * 99n) / 100n, L, 500)!;
  assert.equal(down.zeroForOne, true);
  assert.equal(planSwapToTarget(sc, sc, L, 500), null);
});

test("applyChange", () => {
  const a = usdToAnswer("200");
  assert.equal(applyChange(a, "+20%"), usdToAnswer("240"));
  assert.equal(applyChange(a, "-5%"), usdToAnswer("190"));
  assert.equal(applyChange(a, "x1.5"), usdToAnswer("300"));
  assert.equal(applyChange(a, "123.45"), usdToAnswer("123.45"));
  assert.throws(() => applyChange(a, "-100%"));
  assert.throws(() => applyChange(a, "banana"));
});
