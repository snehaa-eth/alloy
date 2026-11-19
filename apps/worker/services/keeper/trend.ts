import { parseAbi, type Address, type PublicClient } from "viem";

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function getRoundData(uint80) view returns (uint80, int256, uint256, uint256, uint80)",
]);

/**
 * Trend-aware policy input (ARCHITECTURE §3.1): 50-day moving average of daily closes, computed off-chain from the
 * feed's round history (getRoundData walking back from latestRoundData). Daily close = last answer of each UTC day.
 *
 *   trimAllowed  = the last 2 daily closes are both below the MA   ("trim after 2 closes below it")
 *   belowMa      = the latest price is below the MA                ("don't top up components below their MA")
 *
 * With fewer than TREND_MIN_DAYS daily closes (a fresh testnet feed has hours of history), the signal is "unknown"
 * and the keeper falls back to Balanced behaviour for that component. Swap in a market-data API here if needed.
 */
export interface TrendSignal {
  days: number;
  ma: bigint | null;
  last: bigint | null;
  trimAllowed: boolean;
  belowMa: boolean;
  known: boolean;
}

interface Round { id: bigint; answer: bigint; updatedAt: bigint }

const cache = new Map<string, Round[]>(); // feed -> rounds ascending

export async function trendOf(pub: PublicClient, feed: Address, opts: { maDays?: number; minDays?: number; maxRounds?: number } = {}): Promise<TrendSignal> {
  const maDays = opts.maDays ?? 50;
  const minDays = opts.minDays ?? Number(process.env.TREND_MIN_DAYS || 20);
  const maxRounds = opts.maxRounds ?? 1500;
  const [latestId, answer, , updatedAt] = await pub.readContract({ abi: feedAbi, address: feed, functionName: "latestRoundData" });
  const rounds = cache.get(feed) ?? [];
  const haveTo = rounds.at(-1)?.id ?? 0n;
  const fresh: Round[] = [{ id: latestId, answer, updatedAt }];
  const horizon = updatedAt - BigInt((maDays + 5) * 86400);
  for (let id = latestId - 1n, k = 0; id > haveTo && id > 0n && k < maxRounds; id--, k++) {
    try {
      const r = await pub.readContract({ abi: feedAbi, address: feed, functionName: "getRoundData", args: [id] });
      fresh.push({ id, answer: r[1], updatedAt: r[3] });
      if (r[3] < horizon) break;
    } catch {
      break;
    }
  }
  const all = [...rounds.filter((r) => r.id < (fresh.at(-1)?.id ?? 0n)), ...fresh.reverse()].filter((r) => r.updatedAt >= horizon);
  cache.set(feed, all);

  const closes = new Map<bigint, bigint>(); // utc day -> last answer
  for (const r of all) closes.set(r.updatedAt / 86400n, r.answer);
  const series = [...closes.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((e) => e[1]);
  const window = series.slice(-maDays);
  if (window.length < minDays) {
    return { days: series.length, ma: null, last: answer, trimAllowed: true, belowMa: false, known: false };
  }
  const ma = window.reduce((a, b) => a + b, 0n) / BigInt(window.length);
  const [p2, p1] = series.slice(-2);
  return {
    days: series.length,
    ma,
    last: answer,
    trimAllowed: p2 !== undefined && p1 !== undefined && p2 < ma && p1 < ma,
    belowMa: answer < ma,
    known: true,
  };
}
