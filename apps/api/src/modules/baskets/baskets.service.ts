import { getAddress, isAddressEqual, type Address } from "viem";
import type { SupportedChainId } from "../../config/env";
import { basketAbi, basketFactoryAbi, findStock, getDeployment, type Deployment } from "../../config/sdk";
import { read, transferEvent, type ChainClient, type ChainClients } from "../../lib/chain";
import { HttpError } from "../../lib/errors";
import { createTtlCache } from "../../lib/ttlCache";

const BASKET_CACHE_MS = 15_000;
/** Hard cap on baskets enumerated from the factory per request (no indexer yet). */
const MAX_BASKETS = 200;
const ZERO = "0x0000000000000000000000000000000000000000";
const DEAD = "0x000000000000000000000000000000000000dEaD";

export interface OnchainComponent {
  token: Address;
  symbol: string | null;
  underlying: string | null;
  /** Target weight, bps. */
  targetBps: number;
  /** Raw token balance held by the basket (8 dec). */
  balance: string;
  /** USD value at the raw feed price, 8 dec. */
  valueUsd8: string;
  /** Current weight by value, bps. */
  weightBps: number;
}

export interface OnchainBasket {
  chainId: SupportedChainId;
  vault: Address;
  name: string;
  symbol: string;
  creator: Address;
  /** Annual management fee, bps. */
  feeBps: number;
  mode: { absBandBps: number; relBandBps: number; capBps: number; noticeSeconds: number; demo: boolean };
  components: OnchainComponent[];
  /** USD 8 dec. */
  nav: string;
  /** USD 8 dec per 1e18 shares. */
  navPerShare: string;
  totalSupply: string;
  /** USD 8 dec; "0" means unlimited. */
  tvlCap: string;
  pendingRecipe: { targetBps: number[]; executableAt: string; reasonHash: `0x${string}` } | null;
  nextTrimAt: string | null;
  /** Rolling 7-day loss budget used, 1e18 = 100%. */
  lossBudgetUsed: string;
  /** Distinct holders (excluding the dead-share sink). Null until the Transfer-log scan has caught up. */
  followers: number | null;
}

export function createBasketsService(clients: ChainClients, opts: { logsMaxRange: number }) {
  const cache = createTtlCache<unknown>(BASKET_CACHE_MS);
  const holders = new Map<SupportedChainId, HolderIndex>();

  function holderIndex(chainId: SupportedChainId, dep: Deployment) {
    let h = holders.get(chainId);
    if (!h) {
      h = new HolderIndex(clients(chainId), BigInt(dep.contracts.deployedAtBlock), opts.logsMaxRange);
      holders.set(chainId, h);
    }
    return h;
  }

  async function listAddresses(client: ChainClient, dep: Deployment): Promise<Address[]> {
    const factory = getAddress(dep.contracts.factory);
    const count = await read<bigint>(client, factory, basketFactoryAbi, "basketCount");
    const n = Number(count > BigInt(MAX_BASKETS) ? BigInt(MAX_BASKETS) : count);
    return Promise.all(
      Array.from({ length: n }, (_, i) => read<Address>(client, factory, basketFactoryAbi, "allBaskets", [BigInt(i)])),
    );
  }

  return {
    /** All baskets created by the factory (newest first), with live on-chain state. */
    async list(chainId: SupportedChainId): Promise<OnchainBasket[]> {
      const dep = getDeployment(chainId);
      if (!dep) return [];
      const client = clients(chainId);
      const out = (await cache.get(`list:${chainId}`, async () => {
        const vaults = await listAddresses(client, dep);
        return (await Promise.all(vaults.map((v) => readBasket(client, chainId, dep, v)))).reverse();
      })) as OnchainBasket[];
      const followers = holderIndex(chainId, dep).counts(out.map((b) => b.vault));
      return out.map((b) => ({ ...b, followers: followers?.get(b.vault.toLowerCase()) ?? null }));
    },

    /** One basket, or null if `vault` is not an Alloy basket on this chain. */
    async get(chainId: SupportedChainId, vault: Address): Promise<OnchainBasket | null> {
      const dep = getDeployment(chainId);
      if (!dep) return null;
      const client = clients(chainId);
      const b = (await cache.get(`one:${chainId}:${vault.toLowerCase()}`, async () => {
        const ok = await read<boolean>(client, getAddress(dep.contracts.factory), basketFactoryAbi, "isBasket", [vault]);
        return ok ? readBasket(client, chainId, dep, vault) : null;
      })) as OnchainBasket | null;
      if (!b) return null;
      // Followers are tracked over the full basket set so the scan is shared with list().
      const all = await this.list(chainId).catch(() => [] as OnchainBasket[]);
      const f = all.find((x) => isAddressEqual(x.vault, vault))?.followers ?? null;
      return { ...b, followers: f };
    },
  };
}

async function readBasket(
  client: ChainClient,
  chainId: SupportedChainId,
  dep: Deployment,
  vault: Address,
): Promise<OnchainBasket> {
  const r = <T>(fn: string, args?: readonly unknown[]) => read<T>(client, vault, basketAbi, fn, args);
  // Fired together so viem's multicall batching folds them into one eth_call.
  const [
    name,
    symbol,
    creator,
    feeBps,
    absBand,
    relBand,
    cap,
    notice,
    demo,
    targets,
    bundle,
    values,
    nav,
    navPerShare,
    totalSupply,
    pending,
    nextTrimAt,
    lossBudgetUsed,
    tvlCap,
  ] = await Promise.all([
    r<string>("name"),
    r<string>("symbol"),
    r<Address>("creator"),
    r<number>("feeBps"),
    r<number>("absBandBps"),
    r<number>("relBandBps"),
    r<number>("capBps"),
    r<bigint>("notice"),
    r<boolean>("demo"),
    r<readonly number[]>("targets"),
    r<readonly [readonly Address[], readonly bigint[]]>("getBundle"),
    r<readonly bigint[]>("componentValues"),
    r<bigint>("nav"),
    r<bigint>("navPerShare"),
    r<bigint>("totalSupply"),
    r<readonly [readonly number[], bigint, `0x${string}`]>("pendingRecipe"),
    r<bigint>("nextTrimAt"),
    r<bigint>("lossBudgetUsed"),
    read<bigint>(client, getAddress(dep.contracts.factory), basketFactoryAbi, "tvlCapOf", [vault]),
  ]);

  const [tokens, balances] = bundle;
  const totalValue = values.reduce((a, b) => a + b, 0n);
  const components = tokens.map((token, i) => {
    const s = findStock(dep, token);
    const v = values[i] ?? 0n;
    return {
      token: getAddress(token),
      symbol: s?.symbol ?? null,
      underlying: s?.underlying ?? null,
      targetBps: Number(targets[i] ?? 0),
      balance: (balances[i] ?? 0n).toString(),
      valueUsd8: v.toString(),
      weightBps: totalValue === 0n ? 0 : Number((v * 10_000n) / totalValue),
    };
  });
  const [pw, executableAt, reasonHash] = pending;

  return {
    chainId,
    vault: getAddress(vault),
    name,
    symbol,
    creator: getAddress(creator),
    feeBps: Number(feeBps),
    mode: {
      absBandBps: Number(absBand),
      relBandBps: Number(relBand),
      capBps: Number(cap),
      noticeSeconds: Number(notice),
      demo,
    },
    components,
    nav: nav.toString(),
    navPerShare: navPerShare.toString(),
    totalSupply: totalSupply.toString(),
    tvlCap: tvlCap.toString(),
    pendingRecipe:
      executableAt > 0n
        ? { targetBps: pw.map(Number), executableAt: new Date(Number(executableAt) * 1000).toISOString(), reasonHash }
        : null,
    nextTrimAt: nextTrimAt > 0n ? new Date(Number(nextTrimAt) * 1000).toISOString() : null,
    lossBudgetUsed: lossBudgetUsed.toString(),
    followers: null,
  };
}

/**
 * Stop-gap until the indexer exists: rebuilds share balances from basket Transfer logs,
 * incrementally and in the background, `maxRange` blocks per eth_getLogs and at most
 * `CHUNKS_PER_RUN` calls per refresh. Counts are reported only once the scan reaches the
 * chain head; before that (e.g. a cold serverless instance on the 200-block public RPC)
 * followers are null rather than wrong.
 */
const CHUNKS_PER_RUN = 25;
const PARALLEL = 5;

class HolderIndex {
  private next: bigint;
  private head = 0n;
  private key = "";
  private balances = new Map<string, Map<string, bigint>>();
  private running: Promise<void> | null = null;

  constructor(
    private readonly client: ChainClient,
    private readonly startBlock: bigint,
    private readonly maxRange: number,
  ) {
    this.next = startBlock;
  }

  /** Current counts if caught up (null otherwise); kicks off a background catch-up run. */
  counts(vaults: Address[]): Map<string, number> | null {
    const key = vaults.map((v) => v.toLowerCase()).sort().join(",");
    if (key !== this.key) {
      // Basket set changed: restart so the new basket's history is included.
      this.key = key;
      this.next = this.startBlock;
      this.head = 0n;
      this.balances = new Map(vaults.map((v) => [v.toLowerCase(), new Map()]));
    }
    if (vaults.length > 0 && !this.running) {
      this.running = this.advance(vaults)
        .catch((err) => console.error("[holders] scan failed:", err instanceof Error ? err.message.split("\n")[0] : err))
        .finally(() => (this.running = null));
    }
    if (this.head === 0n || this.next <= this.head) return null;
    const out = new Map<string, number>();
    for (const [vault, m] of this.balances) {
      let n = 0;
      for (const [holder, bal] of m) if (bal > 0n && holder !== DEAD.toLowerCase()) n++;
      out.set(vault, n);
    }
    return out;
  }

  /** Test hook: wait for the in-flight scan. */
  async settle() {
    await this.running;
  }

  private async advance(vaults: Address[]) {
    const key = this.key;
    const head = await this.client.getBlockNumber();
    const range = BigInt(this.maxRange);
    let chunks = 0;
    while (this.next <= head && chunks < CHUNKS_PER_RUN) {
      const batch: Array<[bigint, bigint]> = [];
      for (let from = this.next; from <= head && batch.length < PARALLEL && chunks + batch.length < CHUNKS_PER_RUN; from += range) {
        const to = from + range - 1n > head ? head : from + range - 1n;
        batch.push([from, to]);
      }
      const results = await Promise.all(
        batch.map(([fromBlock, toBlock]) => this.client.getLogs({ address: vaults, event: transferEvent, fromBlock, toBlock })),
      );
      if (key !== this.key) return; // basket set changed mid-scan
      for (const logs of results) {
        for (const log of logs) {
          const { from, to, value } = log.args as { from: Address; to: Address; value: bigint };
          const m = this.balances.get(log.address.toLowerCase());
          if (!m) continue;
          if (from.toLowerCase() !== ZERO) m.set(from.toLowerCase(), (m.get(from.toLowerCase()) ?? 0n) - value);
          if (to.toLowerCase() !== ZERO) m.set(to.toLowerCase(), (m.get(to.toLowerCase()) ?? 0n) + value);
        }
      }
      chunks += batch.length;
      this.next = batch[batch.length - 1]![1] + 1n;
    }
    this.head = head;
  }
}

export function assertDeployed(chainId: SupportedChainId) {
  if (!getDeployment(chainId)) throw new HttpError(501, "not_deployed", `Alloy is not deployed on chain ${chainId} yet`);
}
