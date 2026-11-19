/**
 * On-chain read layer (server + browser). Everything is batched through viem multicall.
 *
 * Notes for Base Sepolia's public RPC (https://sepolia.base.org):
 *  - eth_getLogs is limited to a 200-block range, so basket discovery uses factory getters
 *    (basketCount/allBaskets), not BasketCreated logs. Event history (rebalances, followers) is only
 *    scanned when a log-capable RPC is configured (RPC_URL_84532 / NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL).
 *  - Contract USD values are 8dp; the app uses usd6 (divide by 100).
 */
import { erc20Abi, getAddress, parseAbiItem, type Address, type PublicClient } from "viem";
import { aggregatorAbi, basketAbi, basketFactoryAbi, faucetAbi } from "./abis";
import { DEFAULT_CHAIN_ID, rpcUrlFor, type SupportedChainId } from "./chains";
import { getDeployment, isDeployed, stockByToken } from "./contracts";
import { getReadClient } from "./rpc";
import { STRATEGY_MODES } from "./strategy";
import type {
  Basket,
  BasketComponent,
  Creator,
  NavPoint,
  OwedBalance,
  PricePoint,
  RebalanceEvent,
  Stock,
  StrategyMode,
} from "./types";
import { navPerShareUsd6, navUsd6 } from "./units";
import { displayBasketName, displayCopy } from "./display";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/**
 * In-process TTL cache with in-flight dedupe and last-good fallback: the public RPC rate-limits
 * (HTTP 429) under parallel SSR, so a failed refresh serves the previous good value when there is one.
 */
const memoStore = new Map<string, { at: number; value?: unknown; inflight?: Promise<unknown> }>();
export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const e = memoStore.get(key);
  const now = Date.now();
  if (e?.value !== undefined && now - e.at < ttlMs) return e.value as T;
  if (e?.inflight) return e.inflight as Promise<T>;
  const p = fn()
    .then((v) => {
      memoStore.set(key, { at: Date.now(), value: v });
      return v;
    })
    .catch((err) => {
      const prev = memoStore.get(key);
      if (prev?.value !== undefined) {
        memoStore.set(key, { at: prev.at, value: prev.value });
        return prev.value as T;
      }
      memoStore.delete(key);
      throw err;
    });
  memoStore.set(key, { at: e?.at ?? 0, value: e?.value, inflight: p });
  return p;
}

/** Creation blocks of known baskets (skips the getCode bisection). */
const KNOWN_CREATION: Record<string, { block: bigint; t: number }> = {
  "84532:0x60b0e5813df4d7c5e602f78743c73cc90a63d36c": { block: 60561793n, t: 1795034227 },
};

/** Known creators -> display identity. Unknown creators show a short address. */
const KNOWN_CREATORS: Record<string, { handle: string; displayName: string }> = {
  "0xcbe600349ce4cf89842bc371e4a4062140cdcccd": { handle: "alloy_fi", displayName: "Alloy" },
};

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function creatorOf(address: Address): Creator {
  const k = KNOWN_CREATORS[address.toLowerCase()];
  return { address, handle: k?.handle ?? shortAddress(address), displayName: k?.displayName ?? shortAddress(address) };
}

export function modeFromBands(absBandBps: number, relBandBps: number, capBps: number): StrategyMode {
  const lwr = STRATEGY_MODES["let-winners-run"];
  if (absBandBps === lwr.absBandBps && relBandBps === lwr.relBandBps && capBps === lwr.capBps) return "let-winners-run";
  return "balanced";
}

// ---------------------------------------------------------------------------
// Stocks & prices
// ---------------------------------------------------------------------------

export async function readStocks(chainId: SupportedChainId = DEFAULT_CHAIN_ID, client = getReadClient(chainId)): Promise<Stock[]> {
  return memo(`stocks:${chainId}`, 15_000, () => readStocksUncached(chainId, client));
}

async function readStocksUncached(chainId: SupportedChainId, client: PublicClient): Promise<Stock[]> {
  const stocks = getDeployment(chainId).stocks;
  const rounds = await client.multicall({
    allowFailure: true,
    contracts: stocks.map((s) => ({ address: s.feed, abi: aggregatorAbi, functionName: "latestRoundData" as const })),
  });
  return stocks.map((s, k) => {
    const r = rounds[k];
    const ok = r.status === "success" && r.result[1] > 0n;
    return {
      symbol: s.symbol,
      ticker: s.ticker,
      name: s.name,
      token: s.token,
      price8: ok ? (r.result[1] as bigint) : 0n,
      feed: s.feed,
      priceUpdatedAt: ok ? Number(r.result[3]) : undefined,
      iconUrl: s.iconUrl,
      decimals: s.decimals,
    };
  });
}

/**
 * Feed price history from round data (newest `maxRounds` rounds), oldest first.
 * Works for MockPriceFeed (rounds 1..latest) and Chainlink (phase-encoded ids; missing rounds skipped).
 */
export async function readPriceHistory(
  feed: Address,
  opts: { chainId?: SupportedChainId; maxRounds?: number; client?: PublicClient } = {},
): Promise<PricePoint[]> {
  const chainId = opts.chainId ?? DEFAULT_CHAIN_ID;
  const client = opts.client ?? getReadClient(chainId);
  return memo(`hist:${chainId}:${feed.toLowerCase()}:${opts.maxRounds ?? 96}`, 60_000, () =>
    readPriceHistoryUncached(feed, client, opts.maxRounds),
  );
}

async function readPriceHistoryUncached(feed: Address, client: PublicClient, maxRounds?: number): Promise<PricePoint[]> {
  const max = BigInt(Math.max(1, Math.min(maxRounds ?? 96, 500)));
  const latest = await client.readContract({ address: feed, abi: aggregatorAbi, functionName: "latestRoundData" });
  const latestId = latest[0];
  // Chainlink round ids are (phaseId << 64) | aggregatorRound; only walk within the current phase.
  const phaseBase = (latestId >> 64n) << 64n;
  const inPhase = latestId - phaseBase;
  const count = inPhase < max ? inPhase : max;
  const ids: bigint[] = [];
  for (let i = 1n; i < count; i++) ids.push(latestId - i);
  const res = ids.length
    ? await client.multicall({
        allowFailure: true,
        contracts: ids.map((id) => ({ address: feed, abi: aggregatorAbi, functionName: "getRoundData" as const, args: [id] as const })),
      })
    : [];
  const pts: PricePoint[] = [{ t: Number(latest[3]), price8: latest[1] }];
  for (const r of res) {
    if (r.status === "success" && r.result[1] > 0n && r.result[3] > 0n) pts.push({ t: Number(r.result[3]), price8: r.result[1] });
  }
  pts.sort((a, b) => a.t - b.t);
  return pts;
}

/** Price history by stock token / ticker (registry lookup). */
export async function readStockPriceHistory(token: Address, chainId: SupportedChainId = DEFAULT_CHAIN_ID, maxRounds = 96) {
  const s = stockByToken(chainId, token);
  if (!s) return [];
  return readPriceHistory(s.feed, { chainId, maxRounds });
}

// ---------------------------------------------------------------------------
// Baskets
// ---------------------------------------------------------------------------

export async function readBasketAddresses(chainId: SupportedChainId = DEFAULT_CHAIN_ID, client = getReadClient(chainId)): Promise<Address[]> {
  if (!isDeployed(chainId)) return [];
  return memo(`baskets:${chainId}`, 20_000, () => readBasketAddressesUncached(chainId, client));
}

async function readBasketAddressesUncached(chainId: SupportedChainId, client: PublicClient): Promise<Address[]> {
  const { factory } = getDeployment(chainId);
  const n = await client.readContract({ address: factory, abi: basketFactoryAbi, functionName: "basketCount" });
  if (n === 0n) return [];
  const res = await client.multicall({
    allowFailure: false,
    contracts: Array.from({ length: Number(n) }, (_, i) => ({
      address: factory,
      abi: basketFactoryAbi,
      functionName: "allBaskets" as const,
      args: [BigInt(i)] as const,
    })),
  });
  return res.map((a) => getAddress(a as Address));
}

export async function isAlloyBasket(address: Address, chainId: SupportedChainId = DEFAULT_CHAIN_ID): Promise<boolean> {
  if (!isDeployed(chainId)) return false;
  return getReadClient(chainId).readContract({
    address: getDeployment(chainId).factory,
    abi: basketFactoryAbi,
    functionName: "isBasket",
    args: [address],
  });
}

const creationCache = new Map<string, { block: bigint; t: number }>();

/** Basket creation block + time by bisecting eth_getCode (memoized; ~6 batched round-trips). */
export async function readCreation(
  address: Address,
  chainId: SupportedChainId = DEFAULT_CHAIN_ID,
  client = getReadClient(chainId),
): Promise<{ block: bigint; t: number } | null> {
  const key = `${chainId}:${address.toLowerCase()}`;
  const hit = creationCache.get(key) ?? KNOWN_CREATION[key];
  if (hit) return hit;
  try {
    let lo = getDeployment(chainId).deployedAtBlock; // no code at lo-? assume code absent before factory
    let hi = await client.getBlockNumber();
    // Invariant: code exists at hi; find smallest block with code.
    while (hi - lo > 1n) {
      const step = (hi - lo) / 8n || 1n;
      const probes: bigint[] = [];
      for (let b = lo + step; b < hi; b += step) probes.push(b);
      const has = await Promise.all(probes.map((b) => client.getCode({ address, blockNumber: b }).then((c) => !!c && c !== "0x")));
      let newLo = lo;
      let newHi = hi;
      for (let i = 0; i < probes.length; i++) {
        if (has[i]) {
          newHi = probes[i];
          break;
        }
        newLo = probes[i];
      }
      if (newLo === lo && newHi === hi) break;
      lo = newLo;
      hi = newHi;
    }
    const blk = await client.getBlock({ blockNumber: hi });
    const v = { block: hi, t: Number(blk.timestamp) };
    creationCache.set(key, v);
    return v;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export type BasketMetaInput = {
  thesis?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  title?: string | null;
};

/** Built-in copy for baskets without API metadata. */
const BUILTIN_META: Record<string, BasketMetaInput & { category?: Basket["category"] }> = {
  "0x60b0e5813df4d7c5e602f78743c73cc90a63d36c": {
    thesis: "Three platforms that run the modern internet: search and ads, cloud and software, and electric cars.",
    tags: ["big-tech", "demo"],
    category: "ai",
  },
};

function categoryFromTags(tags: string[] | undefined): Basket["category"] {
  const t = new Set(tags ?? []);
  if (t.has("ai")) return "ai";
  if (t.has("story") || t.has("politics") || t.has("capitol")) return "story";
  if (t.has("momentum") || t.has("trend")) return "momentum";
  return "other";
}

/** Full Basket from chain state (+ optional API metadata). */
export async function readBasket(
  address: Address,
  opts: { chainId?: SupportedChainId; meta?: BasketMetaInput | null; client?: PublicClient } = {},
): Promise<Basket> {
  const chainId = opts.chainId ?? DEFAULT_CHAIN_ID;
  const client = opts.client ?? getReadClient(chainId);
  const state = await memo(`basket:${chainId}:${address.toLowerCase()}`, 15_000, () => readBasketState(address, chainId, client));
  return basketFromState(address, chainId, state, opts.meta ?? null);
}

async function readBasketState(address: Address, chainId: SupportedChainId, client: PublicClient) {
  const d = getDeployment(chainId);
  const c = { address, abi: basketAbi } as const;
  const [
    name,
    symbol,
    [tokens, balances],
    targets,
    totalSupply,
    nav8,
    navPerShare8,
    creator,
    demo,
    notice,
    feeBps,
    absBandBps,
    relBandBps,
    capBps,
    [pw, pExec, pHash],
    nextTrimAt,
    lastRebalance,
    lastRecipeExecution,
    tvlCap8,
  ] = await Promise.all([
    client.readContract({ ...c, functionName: "name" }),
    client.readContract({ ...c, functionName: "symbol" }),
    client.readContract({ ...c, functionName: "getBundle" }),
    client.readContract({ ...c, functionName: "targets" }),
    client.readContract({ ...c, functionName: "totalSupply" }),
    client.readContract({ ...c, functionName: "nav" }),
    client.readContract({ ...c, functionName: "navPerShare" }),
    client.readContract({ ...c, functionName: "creator" }),
    client.readContract({ ...c, functionName: "demo" }),
    client.readContract({ ...c, functionName: "notice" }),
    client.readContract({ ...c, functionName: "feeBps" }),
    client.readContract({ ...c, functionName: "absBandBps" }),
    client.readContract({ ...c, functionName: "relBandBps" }),
    client.readContract({ ...c, functionName: "capBps" }),
    client.readContract({ ...c, functionName: "pendingRecipe" }),
    client.readContract({ ...c, functionName: "nextTrimAt" }),
    client.readContract({ ...c, functionName: "lastRebalance" }),
    client.readContract({ ...c, functionName: "lastRecipeExecution" }),
    client.readContract({ address: d.factory, abi: basketFactoryAbi, functionName: "tvlCapOf", args: [address] }),
  ]);
  const [creatorShares, stocks, creation] = await Promise.all([
    client.readContract({ ...c, functionName: "balanceOf", args: [creator] }),
    readStocks(chainId, client),
    withTimeout(readCreation(address, chainId, client), 6_000, null),
  ]);

  return {
    name, symbol, tokens, balances, targets, totalSupply, nav8, navPerShare8, creator, demo, notice, feeBps,
    absBandBps, relBandBps, capBps, pw, pExec, pHash, nextTrimAt, lastRebalance, lastRecipeExecution, tvlCap8,
    creatorShares, stocks, creation,
  };
}

function basketFromState(
  address: Address,
  chainId: SupportedChainId,
  st: Awaited<ReturnType<typeof readBasketState>>,
  apiMeta: BasketMetaInput | null,
): Basket {
  const {
    name, symbol, tokens, balances, targets, totalSupply, nav8, navPerShare8, creator, demo, notice, feeBps,
    absBandBps, relBandBps, capBps, pw, pExec, pHash, nextTrimAt, lastRebalance, lastRecipeExecution, tvlCap8,
    creatorShares, stocks, creation,
  } = st;
  const components: BasketComponent[] = tokens.map((token, k) => {
    const s = stocks.find((x) => x.token.toLowerCase() === token.toLowerCase());
    return {
      stock: s ?? { symbol: shortAddress(token), ticker: shortAddress(token), name: token, token, price8: 0n },
      targetBps: Number(targets[k] ?? 0),
      balance8: balances[k],
    };
  });

  const builtin = BUILTIN_META[address.toLowerCase()];
  const meta = { ...builtin, ...(apiMeta ?? {}) };
  const tags = meta.tags ?? [];
  let mode = modeFromBands(absBandBps, relBandBps, capBps);
  if (tags.includes("trend-aware") && mode === "balanced") mode = "trend-aware";

  const hasPending = pExec > 0n && pHash !== ZERO_HASH;
  return {
    address,
    name: displayBasketName(meta.title || name),
    symbol,
    thesis: displayCopy(meta.thesis ?? ""),
    category: builtin?.category && !apiMeta?.tags?.length ? builtin.category : categoryFromTags(tags),
    creator: creatorOf(creator),
    mode,
    feeBps,
    noticeSeconds: Number(notice),
    demo,
    components,
    totalSupply,
    creatorShares,
    followers: 0,
    createdAt: creation?.t ?? 0,
    source: "chain",
    chainId,
    navUsd6: nav8 / 100n,
    navPerShareUsd6: navPerShare8 / 100n,
    bands: { absBandBps, relBandBps, capBps },
    pendingRecipe: hasPending
      ? { weightsBps: pw.map(Number), executableAt: Number(pExec), reasonHash: pHash }
      : null,
    lastRebalanceAt: Number(lastRebalance),
    lastRecipeExecutionAt: Number(lastRecipeExecution),
    nextTrimAt: Number(nextTrimAt),
    tvlCapUsd6: tvlCap8 === 2n ** 256n - 1n ? 0n : tvlCap8 / 100n,
    imageUrl: meta.imageUrl ?? null,
    tags,
  };
}

// ---------------------------------------------------------------------------
// History (NAV series, rebalances)
// ---------------------------------------------------------------------------

/**
 * NAV-per-share series reconstructed from each component's feed history at the basket's *current*
 * holdings (holdings only change on rebalances, which are rare). Oldest first; last point = now.
 */
export async function readNavSeries(basket: Basket, opts: { maxRounds?: number; now?: number } = {}): Promise<NavPoint[]> {
  const chainId = (basket.chainId ?? DEFAULT_CHAIN_ID) as SupportedChainId;
  const histories = await Promise.all(
    basket.components.map((c) =>
      c.stock.feed
        ? readPriceHistory(c.stock.feed, { chainId, maxRounds: opts.maxRounds ?? 96 }).catch(() => [] as PricePoint[])
        : Promise.resolve([] as PricePoint[]),
    ),
  );
  return navSeriesFromHistories(basket, histories, opts.now);
}

/** Pure: merge per-component price histories into a navPerShare series (carry-forward prices). */
export function navSeriesFromHistories(basket: Basket, histories: PricePoint[][], now?: number): NavPoint[] {
  if (basket.totalSupply === 0n) return [];
  const times = [...new Set(histories.flat().map((p) => p.t))].sort((a, b) => a - b);
  const from = basket.createdAt || 0;
  const pts: NavPoint[] = [];
  const idx = histories.map(() => -1);
  for (const t of times) {
    histories.forEach((h, k) => {
      while (idx[k] + 1 < h.length && h[idx[k] + 1].t <= t) idx[k]++;
    });
    if (t < from) continue;
    const priced = basket.components.map((c, k) => ({
      balance: c.balance8,
      price: idx[k] >= 0 ? histories[k][idx[k]].price8 : c.stock.price8,
    }));
    pts.push({ t, navPerShareUsd6: navPerShareUsd6(navUsd6(priced), basket.totalSupply) });
  }
  const nowPx = basket.components.map((c) => ({ balance: c.balance8, price: c.stock.price8 }));
  const nowT = now ?? Math.floor(Date.now() / 1000);
  const current = basket.navPerShareUsd6 ?? navPerShareUsd6(navUsd6(nowPx), basket.totalSupply);
  if (from > 0 && (pts.length === 0 || pts[0].t > from)) pts.unshift({ t: from, navPerShareUsd6: pts[0]?.navPerShareUsd6 ?? current });
  if (pts.length === 0 || pts[pts.length - 1].t < nowT) pts.push({ t: nowT, navPerShareUsd6: current });
  return pts;
}

/** True when a non-public RPC is configured (public sepolia.base.org caps getLogs at 200 blocks). */
export function canScanLogs(chainId: SupportedChainId = DEFAULT_CHAIN_ID): boolean {
  const server = typeof window === "undefined" ? process.env[`RPC_URL_${chainId}`] : undefined;
  return !!(server || rpcUrlFor(chainId));
}

const EV = {
  proposed: parseAbiItem("event RecipeProposed(uint16[] w, uint64 executableAt, bytes32 reasonHash)"),
  cancelled: parseAbiItem("event RecipeCancelled()"),
  executed: parseAbiItem("event RecipeExecuted(uint16[] w)"),
  rebalanced: parseAbiItem(
    "event Rebalanced(uint256 navBefore, uint256 navAfter, uint256 lossBps, address indexed executor)",
  ),
  transfer: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 amount)"),
};

/**
 * Rebalance feed. With a log-capable RPC: full event history. Otherwise: derived from current state
 * (pending recipe, last recipe execution, last drift trim) — no per-trade details.
 */
export async function readRebalances(basket: Basket, opts: { reasons?: Record<string, string> } = {}): Promise<RebalanceEvent[]> {
  const chainId = (basket.chainId ?? DEFAULT_CHAIN_ID) as SupportedChainId;
  const reasons = Object.fromEntries(Object.entries(opts.reasons ?? {}).map(([k, r]) => [k, displayCopy(r)]));
  const symbols = basket.components.map((c) => c.stock.ticker);
  const current = basket.components.map((c) => c.targetBps);
  const diff = (from: number[], to: number[]) =>
    to.map((w, k) => ({ symbol: symbols[k] ?? `#${k}`, fromBps: from[k] ?? 0, toBps: w })).filter((x) => x.fromBps !== x.toBps);

  if (canScanLogs(chainId)) {
    try {
      const client = getReadClient(chainId);
      const fromBlock = (await withTimeout(readCreation(basket.address, chainId, client), 6_000, null))?.block ?? getDeployment(chainId).deployedAtBlock;
      const logs = await client.getLogs({
        address: basket.address,
        events: [EV.proposed, EV.cancelled, EV.executed, EV.rebalanced],
        fromBlock,
        toBlock: "latest",
      });
      const out: RebalanceEvent[] = [];
      let lastProposal: RebalanceEvent | null = null;
      for (const l of logs) {
        const id = `${l.transactionHash}:${l.logIndex}`;
        if (l.eventName === "RecipeProposed") {
          const a = l.args as { w: readonly number[]; executableAt: bigint; reasonHash: `0x${string}` };
          lastProposal = {
            id,
            kind: "recipe-change",
            status: "pending",
            at: Number(a.executableAt) - basket.noticeSeconds,
            executableAt: Number(a.executableAt),
            changes: diff(current, a.w.map(Number)),
            reason: reasons[a.reasonHash.toLowerCase()],
            txHash: l.transactionHash ?? undefined,
          };
          out.push(lastProposal);
        } else if (l.eventName === "RecipeCancelled") {
          if (lastProposal) lastProposal.status = "cancelled";
          lastProposal = null;
        } else if (l.eventName === "RecipeExecuted") {
          if (lastProposal) {
            lastProposal.status = "executed";
            lastProposal.at = lastProposal.executableAt ?? lastProposal.at;
          }
          lastProposal = null;
        } else if (l.eventName === "Rebalanced") {
          const a = l.args as { lossBps: bigint };
          out.push({
            id,
            kind: "drift-trim",
            status: "executed",
            at: 0,
            changes: [],
            costBps: Number(a.lossBps),
            txHash: l.transactionHash ?? undefined,
          });
        }
      }
      // Timestamps for drift trims.
      const trims = out.filter((e) => e.kind === "drift-trim");
      if (trims.length) {
        const blocks = logs.filter((l) => l.eventName === "Rebalanced").map((l) => l.blockNumber!);
        const ts = await Promise.all(blocks.map((b) => client.getBlock({ blockNumber: b }).then((x) => Number(x.timestamp))));
        trims.forEach((e, i) => (e.at = ts[i] ?? 0));
      }
      if (basket.pendingRecipe == null) out.forEach((e) => e.status === "pending" && (e.status = "cancelled"));
      return out.sort((a, b) => b.at - a.at);
    } catch {
      // fall through to the state-derived feed
    }
  }

  const out: RebalanceEvent[] = [];
  const p = basket.pendingRecipe;
  if (p) {
    out.push({
      id: `pending:${p.reasonHash}`,
      kind: "recipe-change",
      status: "pending",
      at: p.executableAt - basket.noticeSeconds,
      executableAt: p.executableAt,
      changes: diff(current, p.weightsBps),
      reason: p.reason ?? reasons[p.reasonHash.toLowerCase()],
    });
  }
  if (basket.lastRecipeExecutionAt) {
    out.push({
      id: `recipe:${basket.lastRecipeExecutionAt}`,
      kind: "recipe-change",
      status: "executed",
      at: basket.lastRecipeExecutionAt,
      changes: [],
    });
  }
  if (basket.lastRebalanceAt) {
    out.push({ id: `trim:${basket.lastRebalanceAt}`, kind: "drift-trim", status: "executed", at: basket.lastRebalanceAt, changes: [] });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Unique non-zero holders excluding creator/dead (needs a log-capable RPC; else null). */
export async function readFollowers(basket: Basket): Promise<number | null> {
  const chainId = (basket.chainId ?? DEFAULT_CHAIN_ID) as SupportedChainId;
  if (!canScanLogs(chainId)) return null;
  try {
    const client = getReadClient(chainId);
    const fromBlock = (await readCreation(basket.address, chainId, client))?.block ?? getDeployment(chainId).deployedAtBlock;
    const logs = await client.getLogs({ address: basket.address, event: EV.transfer, fromBlock, toBlock: "latest" });
    const holders = new Set<string>();
    for (const l of logs) if (l.args.to) holders.add(l.args.to.toLowerCase());
    holders.delete("0x0000000000000000000000000000000000000000");
    holders.delete("0x000000000000000000000000000000000000dead");
    holders.delete(basket.creator.address.toLowerCase());
    holders.delete(getDeployment(chainId).router.toLowerCase());
    if (holders.size === 0) return 0;
    const bals = await client.multicall({
      allowFailure: false,
      contracts: [...holders].map((h) => ({ address: basket.address, abi: erc20Abi, functionName: "balanceOf" as const, args: [h as Address] as const })),
    });
    return bals.filter((b) => (b as bigint) > 0n).length;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type UserBasketPosition = { basket: Address; shares: bigint; valueUsd6: bigint };

/** The user's share balance in each basket (multicall), valued at navPerShare. */
export async function readUserPositions(
  user: Address,
  baskets: Address[],
  chainId: SupportedChainId = DEFAULT_CHAIN_ID,
  client = getReadClient(chainId),
): Promise<UserBasketPosition[]> {
  if (baskets.length === 0) return [];
  const res = await client.multicall({
    allowFailure: false,
    contracts: baskets.flatMap((b) => [
      { address: b, abi: basketAbi, functionName: "balanceOf" as const, args: [user] as const },
      { address: b, abi: basketAbi, functionName: "navPerShare" as const },
    ]),
  });
  return baskets.map((basket, i) => {
    const shares = res[2 * i] as bigint;
    const nps8 = res[2 * i + 1] as bigint;
    return { basket, shares, valueUsd6: (shares * nps8) / 10n ** 18n / 100n };
  });
}

/** Tokens owed to `user` by a basket after an incomplete redeem. */
export async function readOwed(
  user: Address,
  basket: Address,
  chainId: SupportedChainId = DEFAULT_CHAIN_ID,
  client = getReadClient(chainId),
): Promise<OwedBalance[]> {
  const comps = await client.readContract({ address: basket, abi: basketAbi, functionName: "components" });
  const owed = await client.multicall({
    allowFailure: false,
    contracts: comps.map((t) => ({ address: basket, abi: basketAbi, functionName: "owed" as const, args: [user, t] as const })),
  });
  return comps
    .map((token, k) => ({
      basket,
      token,
      symbol: stockByToken(chainId, token)?.symbol ?? shortAddress(token),
      amount8: owed[k] as bigint,
    }))
    .filter((o) => o.amount8 > 0n);
}

export type FaucetStatus = { availableInSeconds: number; dripUsd6: bigint; usdcBalance: bigint; ethBalance: bigint };

export async function readFaucetStatus(
  user: Address,
  chainId: SupportedChainId = DEFAULT_CHAIN_ID,
  client = getReadClient(chainId),
): Promise<FaucetStatus | null> {
  const d = getDeployment(chainId);
  if (!d.faucet) return null;
  const [availableIn, drip, usdcBalance, ethBalance] = await Promise.all([
    client.readContract({ address: d.faucet, abi: faucetAbi, functionName: "availableIn", args: [user] }),
    client.readContract({ address: d.faucet, abi: faucetAbi, functionName: "dripAmount", args: [d.usdc] }),
    client.readContract({ address: d.usdc, abi: erc20Abi, functionName: "balanceOf", args: [user] }),
    client.getBalance({ address: user }),
  ]);
  return { availableInSeconds: Number(availableIn), dripUsd6: drip, usdcBalance, ethBalance };
}

