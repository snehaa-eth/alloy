/**
 * MOCK DATA — clearly fake baskets, performance and rebalances so page shells
 * render before contracts/API exist. Every number is illustrative.
 * TODO(api): replace with /baskets, /baskets/:a/performance, /baskets/:a/rebalances.
 */
import type { Address, Basket, NavPoint, Performance, Position, RebalanceEvent } from "@/lib/types";
import { mulDiv, navPerShareUsd6, navUsd6 } from "@/lib/units";
import { mockStock } from "./stocks";

const E6 = 10n ** 6n;
const E18 = 10n ** 18n;
const DAY = 86_400;
/** Fixed "now" so server and client render identical mock data. */
export const MOCK_NOW = 1_795_046_400; // 2026-11-19T00:00:00Z

function buildComponents(navUsd: bigint, recipe: [string, number][]) {
  return recipe.map(([ticker, bps]) => {
    const stock = mockStock(ticker);
    const valueUsd6 = mulDiv(navUsd * E6, BigInt(bps), 10_000n);
    // bal8 = usd6 * 1e10 / px8
    const balance8 = mulDiv(valueUsd6, 10n ** 10n, stock.price8);
    return { stock, targetBps: bps, balance8 };
  });
}

const CREATOR_A = { address: "0xA11040000000000000000000000000000000c0de" as Address, handle: "alloy_fi", displayName: "Alloy Research" };
const CREATOR_B = { address: "0xB0b0000000000000000000000000000000000b0b" as Address, handle: "capitol_tracker", displayName: "Capitol Tracker" };
const CREATOR_C = { address: "0xC0c0000000000000000000000000000000000c0c" as Address, handle: "trendy", displayName: "Trend Desk" };

export const MOCK_BASKETS: Basket[] = [
  {
    address: "0xA110000000000000000000000000000000000001",
    name: "AI Leaders",
    symbol: "aAI",
    thesis: "The companies selling the picks and shovels of the AI build-out: chips, cloud and the platforms that monetise models.",
    category: "ai",
    creator: CREATOR_A,
    mode: "balanced",
    feeBps: 100,
    noticeSeconds: DAY,
    demo: false,
    components: buildComponents(12_500n, [["NVDA", 3000], ["MSFT", 2500], ["GOOGL", 2000], ["META", 1500], ["AMZN", 1000]]),
    totalSupply: 1_190n * E18,
    creatorShares: 120n * E18,
    followers: 42,
    createdAt: MOCK_NOW - 30 * DAY,
  },
  {
    address: "0xA110000000000000000000000000000000000002",
    name: "Capitol Hill Tech",
    symbol: "aCAP",
    thesis: "Large-cap tech names that appear in recent public congressional trading disclosures.",
    category: "story",
    creator: CREATOR_B,
    mode: "let-winners-run",
    feeBps: 150,
    noticeSeconds: DAY,
    demo: false,
    components: buildComponents(4_800n, [["AAPL", 3500], ["NVDA", 2500], ["GOOGL", 2000], ["MSFT", 2000]]),
    totalSupply: 470n * E18,
    creatorShares: 50n * E18,
    followers: 17,
    createdAt: MOCK_NOW - 21 * DAY,
    story: { source: "public periodic transaction reports", disclosureDate: "2026-10-31" },
  },
  {
    address: "0xA110000000000000000000000000000000000003",
    name: "Momentum Mix",
    symbol: "aMOM",
    thesis: "High-beta names that tend to trend. We hold while they rise and trim after the 50-day trend breaks.",
    category: "momentum",
    creator: CREATOR_C,
    mode: "trend-aware",
    feeBps: 100,
    noticeSeconds: 10 * 60,
    demo: true,
    components: buildComponents(2_150n, [["TSLA", 3000], ["MSTR", 2500], ["SNDK", 2000], ["SPCX", 1500], ["AMZN", 1000]]),
    totalSupply: 205n * E18,
    creatorShares: 40n * E18,
    followers: 9,
    createdAt: MOCK_NOW - 12 * DAY,
  },
];

/** Deterministic integer random walk (no Math.random, no floats) ending at the current NAV/share. */
function navSeries(basket: Basket, days: number, seed: number): NavPoint[] {
  const end = navPerShareUsd6(navUsd6(basket.components.map((c) => ({ balance: c.balance8, price: c.stock.price8 }))), basket.totalSupply);
  let x = seed;
  const steps: bigint[] = [];
  for (let i = 0; i < days; i++) {
    x = (x * 1_103_515_245 + 12_345) % 2_147_483_648;
    steps.push(BigInt((x % 401) - 190)); // -1.90% .. +2.10% in bps
  }
  const points: NavPoint[] = [{ t: MOCK_NOW, navPerShareUsd6: end }];
  let v = end;
  for (let i = days - 1; i >= 0; i--) {
    v = mulDiv(v, 10_000n, 10_000n + steps[i]);
    points.unshift({ t: MOCK_NOW - (days - i) * DAY, navPerShareUsd6: v });
  }
  return points;
}

function maxDrawdownBps(series: NavPoint[]): number {
  let peak = 0n;
  let worst = 0n;
  for (const p of series) {
    if (p.navPerShareUsd6 > peak) peak = p.navPerShareUsd6;
    if (peak > 0n) {
      const dd = ((peak - p.navPerShareUsd6) * 10_000n) / peak;
      if (dd > worst) worst = dd;
    }
  }
  return Number(worst);
}

export function mockPerformance(basket: Basket): Performance {
  const idx = MOCK_BASKETS.findIndex((b) => b.address === basket.address);
  const series = navSeries(basket, 30, 7 + idx * 31);
  return {
    navSeries: series,
    maxDrawdownBps: maxDrawdownBps(series),
    creatorPnl: { usd6: [182n, 41n, -12n][idx % 3] * E6, bps: [1517, 820, -300][idx % 3] },
    followerPnl: { usd6: [1_204n, 160n, -55n][idx % 3] * E6, bps: [1088, 402, -512][idx % 3] },
    feesEarnedUsd6: [10_270_000n, 2_960_000n, 590_000n][idx % 3],
  };
}

export function mockRebalances(basket: Basket): RebalanceEvent[] {
  const [a, b] = basket.components;
  return [
    {
      id: `${basket.address}-3`,
      kind: "recipe-change",
      status: "pending",
      at: MOCK_NOW - 2 * 3600,
      executableAt: MOCK_NOW - 2 * 3600 + basket.noticeSeconds,
      changes: [
        { symbol: a.stock.symbol, fromBps: a.targetBps, toBps: a.targetBps - 500 },
        { symbol: b.stock.symbol, fromBps: b.targetBps, toBps: b.targetBps + 500 },
      ],
      reason: `Trim ${a.stock.ticker} after a strong run; add to ${b.stock.ticker}.`,
      aiGenerated: basket.demo,
    },
    {
      id: `${basket.address}-2`,
      kind: "drift-trim",
      status: "executed",
      at: MOCK_NOW - 6 * DAY,
      changes: [{ symbol: a.stock.symbol, fromBps: a.targetBps + 620, toBps: a.targetBps + 500 }],
      costBps: 18,
      reason: "Moved back toward the plan.",
    },
    {
      id: `${basket.address}-1`,
      kind: "recipe-change",
      status: "executed",
      at: MOCK_NOW - 15 * DAY,
      changes: [{ symbol: b.stock.symbol, fromBps: b.targetBps - 300, toBps: b.targetBps }],
      costBps: 24,
      reason: "Initial recipe adjustment after launch.",
    },
  ];
}

export const MOCK_POSITIONS: Position[] = [
  { basket: MOCK_BASKETS[0].address, shares: 12n * E18 + 5n * 10n ** 17n, costUsd6: 120n * E6 },
  { basket: MOCK_BASKETS[2].address, shares: 3n * E18, costUsd6: 35n * E6 },
];
