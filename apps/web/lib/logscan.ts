/**
 * Range-safe event log reader.
 *
 * Base Sepolia's public RPC (sepolia.base.org, also thirdweb) rejects eth_getLogs over more than 200 blocks
 * (code -32614). Basket history spans hundreds of thousands of blocks, so one getLogs call fails and
 * 200-block windows would need thousands of calls (the public RPC then answers 429 to every read).
 *
 * So all logs of a contract are fetched once per (chain, address), shared by every reader (followers,
 * rebalances; each decodes only its own events), and kept in an incremental in-process cache (refreshes
 * only fetch blocks mined since the last scan). Ranges are filled from an ordered list of sources; each
 * picks up where the previous one stopped (progress is committed window by window):
 *
 *   1. LOGS_RPC_URL_<chain>     a log-capable RPC you configure (paid Alchemy/QuickNode/…), LOGS_BLOCK_RANGE
 *                               blocks per call (default 10 000)
 *   2. keyless public RPCs that accept wide ranges (Base Sepolia: Tenderly gateway, then publicnode at
 *      50 000 blocks)
 *   3. Blockscout logs API — only with BLOCKSCOUT_API_KEY (keyless is ~10 requests/hour/IP) or an explicit
 *      BLOCKSCOUT_URL_<chain>; it stops TAIL_BLOCKS short of the head to cover indexing lag
 *   4. the app's read RPC in 200-block windows, at most LOGS_MAX_RPC_WINDOWS (default 30) calls
 *
 * Other env: LOGS_PUBLIC_RPCS=off disables source 2.
 */
import {
  createPublicClient,
  http,
  parseEventLogs,
  type AbiEvent,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";

export type ScannedLog = {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
  /** Block timestamp (seconds) when the source provided it (Blockscout does, RPC getLogs does not). */
  timestamp?: number;
};

/** Undecoded log as cached (enough for parseEventLogs). */
type RawLog = {
  address: Address;
  topics: [Hex, ...Hex[]] | [];
  data: Hex;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
  timestamp?: number;
};

/** Keyless RPCs verified to serve wide getLogs ranges (2026-11). `range` = blocks per call. */
const PUBLIC_LOG_RPCS: Record<number, { url: string; range: bigint }[]> = {
  84532: [
    { url: "https://base-sepolia.gateway.tenderly.co", range: 500_000n },
    { url: "https://base-sepolia-rpc.publicnode.com", range: 50_000n },
  ],
  8453: [
    { url: "https://base.gateway.tenderly.co", range: 500_000n },
    { url: "https://base-rpc.publicnode.com", range: 50_000n },
  ],
};

const BLOCKSCOUT: Record<number, string> = {
  84532: "https://base-sepolia.blockscout.com",
  8453: "https://base.blockscout.com",
};

/**
 * Blocks re-read on every refresh. Covers a node that trails the head and answers an empty result for
 * blocks it hasn't seen yet (instead of an error), and shallow reorgs. The merge dedupes the overlap.
 */
const RESCAN_OVERLAP = 10n;
/** A cached address isn't refreshed more often than this (keeps repeat page loads off the network). */
const MIN_REFRESH_MS = 15_000;
/** Blocks at the head that Blockscout is not trusted for (indexing lag). */
const TAIL_BLOCKS = 400n;
const MAX_RPC_CONCURRENCY = 4;
/** After Blockscout answers 429, skip it for this long instead of hammering it. */
const BLOCKSCOUT_COOLDOWN_MS = 10 * 60_000;
let blockscoutPausedUntil = 0;

const env = (k: string): string | undefined => (typeof process !== "undefined" ? process.env[k] || undefined : undefined);

function envInt(k: string, dflt: number): number {
  const n = Number(env(k) ?? dflt);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function limiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    while (active >= max) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
/** Process-wide cap on concurrent getLogs calls, so parallel SSR doesn't flood an RPC. */
const rpcSlot = limiter(MAX_RPC_CONCURRENCY);

const logId = (l: { transactionHash: Hex; logIndex: number }) => `${l.transactionHash}:${l.logIndex}`;

function sortLogs<T extends { blockNumber: bigint; logIndex: number }>(logs: T[]): T[] {
  return logs.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1));
}

const logClients = new Map<string, PublicClient>();
function logClient(url: string): PublicClient {
  let c = logClients.get(url);
  if (!c) {
    c = createPublicClient({ transport: http(url, { timeout: 15_000, retryCount: 1 }) }) as PublicClient;
    logClients.set(url, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

type Commit = (scannedTo: bigint, logs: RawLog[]) => void;
type Source = {
  name: string;
  /** RPC behind this source (used to read the chain head). */
  client?: PublicClient;
  /** Fill [from, to] (or a prefix of it), committing progress in order. Throws on failure. */
  scan: (address: Address, from: bigint, to: bigint, commit: Commit) => Promise<void>;
};

/** eth_getLogs over [from, to] in `range`-block windows; commits each contiguous completed prefix. */
async function getLogsWithRetry(client: PublicClient, address: Address, from: bigint, to: bigint, retries: number) {
  for (let attempt = 0; ; attempt++) {
    try {
      return (await client.request({
        method: "eth_getLogs",
        params: [{ address, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }],
      })) as Log<string, string>[];
    } catch (e) {
      // Free public nodes rate-limit bursts (HTTP 429 / "exceeds defined limit"): back off briefly.
      if (attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt + Math.random() * 300));
    }
  }
}

function rpcSource(
  name: string,
  client: PublicClient,
  range: bigint,
  opts: { maxWindows?: number; retries?: number } = {},
): Source {
  const maxWindows = opts.maxWindows ?? Infinity;
  return {
    name,
    client,
    async scan(address, from, to, commit) {
      if (to < from) return;
      const windows: [bigint, bigint][] = [];
      for (let a = from; a <= to; a += range) windows.push([a, a + range - 1n > to ? to : a + range - 1n]);
      if (windows.length > maxWindows) throw new Error(`${windows.length} windows needed (max ${maxWindows})`);
      const results: (RawLog[] | undefined)[] = new Array(windows.length);
      let committed = 0;
      await Promise.all(
        windows.map((w, i) =>
          rpcSlot(async () => {
            const raw = await getLogsWithRetry(client, address, w[0], w[1], opts.retries ?? 0);
            results[i] = raw.map((l) => ({
              address: l.address,
              topics: l.topics as RawLog["topics"],
              data: l.data,
              blockNumber: BigInt(l.blockNumber!),
              logIndex: Number(l.logIndex!),
              transactionHash: l.transactionHash!,
            }));
            const start = committed;
            while (committed < windows.length && results[committed]) committed++;
            if (committed > start) commit(windows[committed - 1][1], results.slice(start, committed).flat() as RawLog[]);
          }),
        ),
      );
    },
  };
}

type BlockscoutLog = {
  address: string;
  topics: (string | null)[];
  data: string;
  blockNumber: string;
  logIndex: string;
  transactionHash: string;
  timeStamp?: string;
};

/** Blockscout Etherscan-compatible logs API; paginates by block when a page is full. */
function blockscoutSource(baseUrl: string, apiKey: string | undefined): Source {
  const PAGE = 1000;
  async function page(url: string): Promise<BlockscoutLog[]> {
    if (Date.now() < blockscoutPausedUntil) throw new Error("cooling down after HTTP 429");
    const res = await fetch(apiKey ? `${url}&apikey=${encodeURIComponent(apiKey)}` : url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429) blockscoutPausedUntil = Date.now() + BLOCKSCOUT_COOLDOWN_MS;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { message?: string; result?: BlockscoutLog[] | string };
    if (Array.isArray(body.result)) return body.result;
    if (/no (records|logs) found/i.test(body.message ?? "")) return [];
    throw new Error(body.message ?? "bad response");
  }
  return {
    name: "blockscout",
    async scan(address, from, latest, commit) {
      const to = latest - TAIL_BLOCKS;
      if (to < from) return;
      const out: BlockscoutLog[] = [];
      let cursor = from;
      for (let guard = 0; guard < 100; guard++) {
        const rows = await page(`${baseUrl}/api?module=logs&action=getLogs&address=${address}&fromBlock=${cursor}&toBlock=${to}&offset=${PAGE}`);
        out.push(...rows);
        if (rows.length < PAGE) break;
        const last = BigInt(rows[rows.length - 1].blockNumber);
        if (last <= cursor) throw new Error("page did not advance");
        cursor = last; // the merge dedupes the overlapping block
      }
      commit(
        to,
        out.map((l) => ({
          address: l.address as Address,
          topics: l.topics.filter((t): t is string => !!t) as RawLog["topics"],
          data: l.data as Hex,
          blockNumber: BigInt(l.blockNumber),
          logIndex: Number(l.logIndex),
          transactionHash: l.transactionHash as Hex,
          timestamp: l.timeStamp ? Number(l.timeStamp) : undefined,
        })),
      );
    },
  };
}

function sourcesFor(chainId: number, client: PublicClient): Source[] {
  const out: Source[] = [];
  const custom = env(`LOGS_RPC_URL_${chainId}`);
  if (custom) out.push(rpcSource("LOGS_RPC_URL", logClient(custom), BigInt(envInt("LOGS_BLOCK_RANGE", 10_000)), { retries: 2 }));
  if (env("LOGS_PUBLIC_RPCS") !== "off") {
    for (const p of PUBLIC_LOG_RPCS[chainId] ?? []) out.push(rpcSource(new URL(p.url).hostname, logClient(p.url), p.range, { retries: 2 }));
  }
  const bsKey = env("BLOCKSCOUT_API_KEY");
  const bsUrl = env(`BLOCKSCOUT_URL_${chainId}`);
  if (bsUrl !== "off" && (bsKey || bsUrl) && (bsUrl || BLOCKSCOUT[chainId])) out.push(blockscoutSource(bsUrl || BLOCKSCOUT[chainId], bsKey));
  out.push(rpcSource("read RPC", client, 200n, { maxWindows: envInt("LOGS_MAX_RPC_WINDOWS", 30) }));
  return out;
}

// ---------------------------------------------------------------------------
// Incremental cache (raw logs per chain + address)
// ---------------------------------------------------------------------------

type Entry = { from: bigint; scannedTo: bigint; logs: RawLog[]; at?: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Entry>>();

function merged(prev: RawLog[], next: RawLog[]): RawLog[] {
  if (next.length === 0) return prev;
  const byId = new Map(prev.map((l) => [logId(l), l]));
  for (const l of next) {
    const p = byId.get(logId(l));
    byId.set(logId(l), p?.timestamp != null && l.timestamp == null ? { ...l, timestamp: p.timestamp } : l);
  }
  return sortLogs([...byId.values()]);
}

/**
 * Chain head, read from the log sources first (so the range we ask a source for exists on it), else the
 * read RPC. Shared by every address for a couple of seconds (one call per page load, not per basket).
 */
const heads = new Map<number, { at: number; p: Promise<bigint> }>();
function headOf(chainId: number, sources: Source[]): Promise<bigint> {
  const hit = heads.get(chainId);
  if (hit && Date.now() - hit.at < 2_000) return hit.p;
  const p = (async () => {
    let last: unknown;
    for (const s of sources) {
      if (!s.client) continue;
      try {
        return await s.client.getBlockNumber({ cacheTime: 0 });
      } catch (e) {
        last = e;
      }
    }
    throw last ?? new Error("no RPC for chain head");
  })();
  heads.set(chainId, { at: Date.now(), p });
  p.catch(() => heads.delete(chainId));
  return p;
}

async function refresh(client: PublicClient, chainId: number, address: Address, fromBlock: bigint): Promise<Entry> {
  const key = `${chainId}:${address.toLowerCase()}`;
  const sources = sourcesFor(chainId, client);
  const latest = await headOf(chainId, sources);
  let entry = cache.get(key);
  if (!entry || fromBlock < entry.from) entry = { from: fromBlock, scannedTo: fromBlock - 1n, logs: [] };
  if (entry.scannedTo >= latest) return entry;

  const commit: Commit = (to, logs) => {
    const cur = entry!;
    entry = { from: cur.from, scannedTo: to > cur.scannedTo ? to : cur.scannedTo, logs: merged(cur.logs, logs) };
    cache.set(key, entry);
  };

  const errors: string[] = [];
  for (const src of sources) {
    if (entry.scannedTo >= latest) break;
    try {
      await src.scan(address, entry.scannedTo + 1n, latest, commit);
    } catch (e) {
      errors.push(`${src.name}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }
  }
  if (entry.scannedTo < latest) throw new Error(`log scan incomplete for ${address} (${errors.join("; ")})`);
  if (errors.length) console.warn(`[logscan] ${address}: fell back past ${errors.join("; ")}`);
  const overlapFrom = latest - RESCAN_OVERLAP;
  entry = { ...entry, scannedTo: overlapFrom > entry.from - 1n ? overlapFrom : entry.from - 1n, at: Date.now() };
  cache.set(key, entry);
  return entry;
}

/**
 * All logs of `events` emitted by `address` from `fromBlock` to the current head, oldest first.
 * Throws if the range cannot be read (callers decide on the fallback). Concurrent callers for the same
 * address share one fetch.
 */
export async function scanLogs(
  client: PublicClient,
  params: { chainId: number; address: Address; events: readonly AbiEvent[]; fromBlock: bigint },
): Promise<ScannedLog[]> {
  const { chainId, address, events, fromBlock } = params;
  const key = `${chainId}:${address.toLowerCase()}`;
  const fresh = cache.get(key);
  let p = inflight.get(key);
  if (!p && fresh?.at && fromBlock >= fresh.from && Date.now() - fresh.at < MIN_REFRESH_MS) p = Promise.resolve(fresh);
  if (!p) {
    p = refresh(client, chainId, address, fromBlock).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  let entry = await p;
  // A concurrent refresh may have started from a later block; redo once if it doesn't cover fromBlock.
  if (fromBlock < entry.from) entry = await refresh(client, chainId, address, fromBlock);

  const raw = entry.logs.filter((l) => l.blockNumber >= fromBlock);
  const parsed = parseEventLogs({ abi: events as AbiEvent[], logs: raw as never, strict: true }) as unknown as (RawLog & {
    eventName: string;
    args: Record<string, unknown>;
  })[];
  return parsed.map((l) => ({
    eventName: l.eventName,
    args: l.args,
    blockNumber: l.blockNumber,
    logIndex: l.logIndex,
    transactionHash: l.transactionHash,
    timestamp: l.timestamp,
  }));
}
