/**
 * Pure rebalance planner (no I/O). Mirrors the on-chain band rule in Basket._checkBands (NOTES.md decision 4):
 *   band(T) = min(abs, rel*T)  (a 10_000 setting disables that limb; band(0) = 0)
 *   in band  := |w - T| <= band  &&  w <= cap
 *   every component must END in band; one that started out of band must not move away from T nor cross it.
 *
 * Policy: out-of-band components are moved to their band edge (minus a small safety margin, because execution cost
 * shifts weights slightly) — "trim to edge". The weight freed/needed is absorbed by in-band components, first toward
 * their target (never across it), then within their band. Trades go from -> USDC -> to (one Trade per pair).
 */

export const BPS = 10_000;

export interface PlanInput {
  /** component value, USD 8 dec (feed price x balance / 1e8) */
  values: readonly bigint[];
  /** raw component balance (8 dec) */
  balances: readonly bigint[];
  /** feed price (USD 8 dec per raw token) */
  prices: readonly bigint[];
  targetBps: readonly number[];
  absBandBps: number;
  relBandBps: number;
  capBps: number;
  /** safety margin inside the band edge, bps of NAV (capped at band/2) */
  marginBps: number;
  /** components that must not be trimmed if they are over band (trend-aware: uptrend winners) */
  noTrim?: Set<number>;
  /** components that should not receive top-ups unless forced (trend-aware: below their MA) */
  noTopUp?: Set<number>;
  /** ignore plans whose total traded value is below this (USD 8 dec) */
  minTradeUsd8?: bigint;
}

export interface Trade {
  from: number;
  to: number;
  amountIn: bigint;
}

export interface Plan {
  status: "in-band" | "trade" | "blocked" | "too-small" | "infeasible";
  reason?: string;
  weights: number[];
  desired: number[];
  outOfBand: number[];
  trades: Trade[];
  tradedUsd8: bigint;
}

/** Band as a fraction of NAV (Infinity if both limbs are disabled). */
export function bandOf(tBps: number, absBandBps: number, relBandBps: number): number {
  if (tBps === 0) return 0;
  let band = Infinity;
  if (absBandBps < BPS) band = absBandBps / BPS;
  if (relBandBps < BPS) band = Math.min(band, (tBps * relBandBps) / BPS / BPS);
  return band;
}

export function isInBand(w: number, tBps: number, absBandBps: number, relBandBps: number, capBps: number): boolean {
  const T = tBps / BPS;
  const band = bandOf(tBps, absBandBps, relBandBps);
  return Math.abs(w - T) <= band + 1e-12 && w <= capBps / BPS + 1e-12;
}

export function plan(input: PlanInput): Plan {
  const n = input.values.length;
  const nav = input.values.reduce((a, b) => a + b, 0n);
  const navF = Number(nav);
  const w = input.values.map((v) => (navF > 0 ? Number(v) / navF : 0));
  const T = input.targetBps.map((t) => t / BPS);
  const cap = input.capBps / BPS;
  const band = input.targetBps.map((t) => bandOf(t, input.absBandBps, input.relBandBps));
  const m = input.marginBps / BPS;
  const lo: number[] = [], hi: number[] = [];
  for (let i = 0; i < n; i++) {
    const mi = Number.isFinite(band[i]!) ? Math.min(m, band[i]! / 2) : m;
    if (T[i] === 0) {
      lo.push(0);
      hi.push(0);
      continue;
    }
    lo.push(Number.isFinite(band[i]!) ? Math.max(0, T[i]! - band[i]! + mi) : 0);
    hi.push(Math.min(T[i]! + band[i]!, cap) - mi);
  }
  const outOfBand = w
    .map((wi, i) => (isInBand(wi, input.targetBps[i]!, input.absBandBps, input.relBandBps, input.capBps) ? -1 : i))
    .filter((i) => i >= 0);
  const base: Plan = { status: "in-band", weights: w, desired: [...w], outOfBand, trades: [], tradedUsd8: 0n };
  if (outOfBand.length === 0 || navF === 0) return base;

  for (const i of outOfBand) {
    if (w[i]! > T[i]! && input.noTrim?.has(i)) {
      return { ...base, status: "blocked", reason: `component ${i} is over band but marked no-trim (uptrend)` };
    }
  }

  // 1. clamp out-of-band components to their (margined) band edge
  const d = [...w];
  const fixed = new Set(outOfBand);
  for (const i of outOfBand) d[i] = Math.min(Math.max(w[i]!, lo[i]!), hi[i]!);
  let excess = 1 - d.reduce((a, b) => a + b, 0); // > 0: weight to place; < 0: weight to take

  const fill = (cands: number[], room: (i: number) => number) => {
    const rooms = cands.map((i) => Math.max(0, room(i)));
    const total = rooms.reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const take = Math.min(Math.abs(excess), total);
    cands.forEach((i, k) => {
      const delta = (rooms[k]! / total) * take;
      d[i] = d[i]! + (excess > 0 ? delta : -delta);
    });
    excess += excess > 0 ? -take : take;
  };
  const free = [...Array(n).keys()].filter((i) => !fixed.has(i));
  const eps = 1e-12;
  if (excess > eps) {
    const pref = free.filter((i) => !input.noTopUp?.has(i));
    fill(pref, (i) => T[i]! - d[i]!); // toward target, never across
    if (excess > eps) fill(pref, (i) => hi[i]! - d[i]!); // within band
    if (excess > eps) fill(free, (i) => T[i]! - d[i]!); // forced: include no-top-up comps
    if (excess > eps) fill(free, (i) => hi[i]! - d[i]!);
    // out-of-band underweights may also absorb up to (not across) their target
    if (excess > eps) fill(outOfBand.filter((i) => w[i]! < T[i]!), (i) => T[i]! - d[i]!);
  } else if (excess < -eps) {
    fill(free, (i) => d[i]! - T[i]!);
    if (excess < -eps) fill(free, (i) => d[i]! - lo[i]!);
    if (excess < -eps) fill(outOfBand.filter((i) => w[i]! > T[i]!), (i) => d[i]! - T[i]!);
  }
  if (Math.abs(excess) > 1e-9) return { ...base, desired: d, status: "infeasible", reason: `cannot place ${excess}` };

  // 2. trades: pair sellers (d < w) with buyers (d > w), greedy, in USD 8 dec
  const sell: { i: number; usd: bigint }[] = [];
  const buy: { i: number; usd: bigint }[] = [];
  for (let i = 0; i < n; i++) {
    const usd = BigInt(Math.floor(Math.abs(d[i]! - w[i]!) * navF));
    if (usd === 0n) continue;
    (d[i]! < w[i]! ? sell : buy).push({ i, usd });
  }
  const trades: Trade[] = [];
  let traded = 0n;
  let bi = 0;
  for (const s of sell) {
    let left = s.usd;
    while (left > 0n && bi < buy.length) {
      const b = buy[bi]!;
      const x = left < b.usd ? left : b.usd;
      let amountIn = (x * 10n ** 8n) / input.prices[s.i]!;
      if (amountIn > input.balances[s.i]!) amountIn = input.balances[s.i]!;
      if (amountIn > 0n) {
        const prev = trades.find((t) => t.from === s.i && t.to === b.i);
        if (prev) prev.amountIn += amountIn;
        else trades.push({ from: s.i, to: b.i, amountIn });
      }
      traded += x;
      left -= x;
      b.usd -= x;
      if (b.usd === 0n) bi++;
    }
  }
  if (traded < (input.minTradeUsd8 ?? 0n)) return { ...base, desired: d, status: "too-small", tradedUsd8: traded };
  return { ...base, desired: d, status: "trade", trades, tradedUsd8: traded };
}
