/**
 * Alloy keeper (ARCHITECTURE §3.1 strategy modes, §4 keeper). Every KEEPER_INTERVAL_SEC (60):
 *   for each basket (factory.allBaskets):
 *     - due recipe (now >= executableAt): executeRebalance(trades to bring every component into band of the NEW
 *       targets; [] if already in band). Never blocked by the trim cooldown.
 *     - else if now >= nextTrimAt and something is out of band, per mode:
 *         balanced        trim breaches to the band edge
 *         let-winners-run params disable drift bands, so only cap breaches trade
 *         trend           like balanced, but never trim an over-band winner unless it had 2 daily closes below its
 *                         50DMA, and prefer not to top up components below their MA
 *     - accrueFee() when lastAccrual is older than ACCRUE_EVERY_DAYS (7)
 *   Every tx is simulated first (simulateContract as the keeper); DRY_RUN=true stops after simulation.
 *
 * Signer: KEEPER_PK (hex private key; never logged) or KEEPER_ADDRESS on an unlocked local node (fork testing).
 *   pnpm keeper            loop
 *   pnpm keeper --once     single pass
 *   pnpm keeper --dry-run  plan + simulate only
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  fallback,
  formatEther,
  getAddress,
  http,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_ID, FACTORY, RPC_URLS } from "../../lib/config";
import { basketAbi, basketFactoryAbi, iAggregatorV3Abi, simpleFeedGuardAbi } from "../../lib/sdk";
import { writeState } from "../../lib/status";
import { alert } from "./alerts";
import { plan, type Plan, type Trade } from "./planner";
import { trendOf } from "./trend";

type Mode = "balanced" | "let-winners-run" | "trend";

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run") || process.env.DRY_RUN === "true";
const ONCE = argv.includes("--once");
const INTERVAL = Number(process.env.KEEPER_INTERVAL_SEC || 60) * 1000;
const MARGIN_BPS = Number(process.env.KEEPER_MARGIN_BPS || 20);
const MIN_TRADE_USD8 = BigInt(Math.round(Number(process.env.KEEPER_MIN_TRADE_USD || 1) * 1e8));
const ACCRUE_EVERY = Number(process.env.ACCRUE_EVERY_DAYS || 7) * 86400;
const MAX_FEED_AGE = Number(process.env.MAX_FEED_AGE_SEC || 25 * 3600);
const LOW_BALANCE_ETH = Number(process.env.KEEPER_LOW_BALANCE_ETH || 0.005);
const GAS_MULTIPLIER = Number(process.env.KEEPER_GAS_MULTIPLIER || 2);
const OVERDUE_SEC = Number(process.env.RECIPE_OVERDUE_ALERT_MIN || 30) * 60;
const errorAbi = [...basketAbi, ...simpleFeedGuardAbi, ...basketFactoryAbi.filter((x) => x.type === "error")];

/* ------------------------------------------------------------------ setup */

const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 84532 ? "Base Sepolia" : `chain-${CHAIN_ID}`,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: RPC_URLS } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});
const transport = RPC_URLS.length > 1 ? fallback(RPC_URLS.map((u) => http(u))) : http(RPC_URLS[0]);
const pub = createPublicClient({ chain, transport }) as PublicClient;

function signer(): Account | Address | undefined {
  const pk = process.env.KEEPER_PK;
  if (pk) {
    const hex = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
    if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) throw new Error("KEEPER_PK must be a 32-byte hex private key");
    return privateKeyToAccount(hex);
  }
  if (process.env.KEEPER_ADDRESS) return getAddress(process.env.KEEPER_ADDRESS);
  return undefined;
}
const account = signer();
const keeperAddr = account ? (typeof account === "string" ? account : account.address) : undefined;
const wallet = account ? createWalletClient({ chain, transport, account }) : undefined;

/** Mode overrides: KEEPER_MODES='{"<basket address or symbol>":"trend"}' and/or config/modes.json (same shape). */
function loadModes(): Record<string, Mode> {
  const out: Record<string, Mode> = {};
  const file = resolve(process.env.KEEPER_MODES_FILE || resolve(import.meta.dirname, "../../config/modes.json"));
  const merge = (o: Record<string, string>) => {
    for (const [k, v] of Object.entries(o)) if (!k.startsWith("_")) out[k.toLowerCase()] = v as Mode;
  };
  if (existsSync(file)) merge(JSON.parse(readFileSync(file, "utf8")).modes ?? {});
  if (process.env.KEEPER_MODES) merge(JSON.parse(process.env.KEEPER_MODES));
  return out;
}
const modes = loadModes();

function modeOf(addr: Address, symbol: string, abs: number, rel: number): Mode {
  const m = modes[addr.toLowerCase()] ?? modes[symbol.toLowerCase()];
  if (m) return m;
  return abs >= 10_000 && rel >= 10_000 ? "let-winners-run" : "balanced";
}

function decode(e: unknown): string {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) {
      return r.data ? `${r.data.errorName}(${(r.data.args ?? []).map(String).join(",")})` : r.shortMessage;
    }
    return e.shortMessage;
  }
  return e instanceof Error ? e.message.split("\n")[0]! : String(e);
}

/* ------------------------------------------------------------------ per basket */

interface BasketReport {
  basket: Address;
  symbol: string;
  mode: Mode;
  action: string;
  detail?: string;
  tx?: Hex;
}

async function readBasket(b: Address) {
  const c = { abi: basketAbi, address: b } as const;
  const r = await pub.multicall({
    allowFailure: false,
    contracts: [
      { ...c, functionName: "symbol" },
      { ...c, functionName: "components" },
      { ...c, functionName: "targets" },
      { ...c, functionName: "absBandBps" },
      { ...c, functionName: "relBandBps" },
      { ...c, functionName: "capBps" },
      { ...c, functionName: "pendingRecipe" },
      { ...c, functionName: "nextTrimAt" },
      { ...c, functionName: "getBundle" },
      { ...c, functionName: "totalSupply" },
      { ...c, functionName: "deadShares" },
      { ...c, functionName: "lastAccrual" },
    ],
  });
  const [symbol, comps, targets, abs, rel, cap, pending, nextTrimAt, bundle, ts, dead, lastAccrual] = r;
  return { symbol, comps, targets: targets.map(Number), abs, rel, cap, pending, nextTrimAt, balances: bundle[1], ts, dead, lastAccrual };
}

async function feedsOf(comps: readonly Address[]) {
  const cfgs = await pub.multicall({
    allowFailure: false,
    contracts: comps.map((t) => ({ abi: basketFactoryAbi, address: FACTORY, functionName: "tokenConfig", args: [t] }) as const),
  });
  const feeds = cfgs.map((c) => (c as { feed: Address }).feed);
  const rounds = await pub.multicall({
    allowFailure: false,
    contracts: feeds.map((f) => ({ abi: iAggregatorV3Abi, address: f, functionName: "latestRoundData" }) as const),
  });
  return { feeds, prices: rounds.map((r) => r[1]), updatedAt: rounds.map((r) => r[3]) };
}

async function send(b: Address, functionName: "executeRebalance" | "accrueFee", args: readonly unknown[]): Promise<{ ok: boolean; detail: string; tx?: Hex }> {
  const from = keeperAddr ?? (await pub.readContract({ abi: basketFactoryAbi, address: FACTORY, functionName: "keeper" }));
  try {
    const sim = await pub.simulateContract({ abi: errorAbi, address: b, functionName, args, account: from } as never);
    if (DRY_RUN || !wallet) return { ok: true, detail: DRY_RUN ? "dry-run: simulation ok" : "no signer: simulation ok" };
    // B20 precompile gas is under-estimated on Base (seen on a Sepolia fork: estimate 1.23M, OOG at 1.21M while
    // the same trade needs ~0.94M warm). Pad the estimate like the deploy scripts do (--gas-estimate-multiplier).
    const est = await pub.estimateContractGas({ abi: errorAbi, address: b, functionName, args, account: from } as never);
    const gas = (est * BigInt(Math.round(GAS_MULTIPLIER * 100))) / 100n;
    const hash = await wallet.writeContract({ ...(sim as unknown as { request: object }).request, gas } as never);
    const rcpt = await pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
    return { ok: rcpt.status === "success", detail: `status=${rcpt.status} gas=${rcpt.gasUsed}`, tx: hash };
  } catch (e) {
    return { ok: false, detail: decode(e) };
  }
}

async function processBasket(b: Address, now: bigint): Promise<BasketReport> {
  const s = await readBasket(b);
  const mode = modeOf(b, s.symbol, s.abs, s.rel);
  const rep: BasketReport = { basket: b, symbol: s.symbol, mode, action: "none" };
  if (s.ts <= s.dead) return { ...rep, action: "skip", detail: "empty basket" };

  // weekly fee poke (independent of rebalancing; anyone may call accrueFee)
  if (now - s.lastAccrual >= BigInt(ACCRUE_EVERY)) {
    const r = await send(b, "accrueFee", []);
    await alert(r.ok ? "info" : "warn", `accrue:${b}`, `${s.symbol} accrueFee ${r.ok ? "ok" : "failed"}: ${r.detail}${r.tx ? ` tx ${r.tx}` : ""}`);
  }

  const { feeds, prices, updatedAt } = await feedsOf(s.comps);
  const stale = updatedAt.map((u, i) => (now - u > BigInt(MAX_FEED_AGE) ? i : -1)).filter((i) => i >= 0);
  const [, executableAt] = s.pending;
  const recipeDue = executableAt !== 0n && now >= executableAt;
  const targets = recipeDue ? s.pending[0].map(Number) : s.targets;

  if (stale.length) {
    await alert("warn", `stale:${b}`, `${s.symbol}: stale feed(s) ${stale.map((i) => feeds[i]).join(",")} — rebalances blocked`);
    if (recipeDue && now - executableAt > BigInt(OVERDUE_SEC)) {
      await alert("error", `overdue:${b}`, `${s.symbol}: recipe overdue ${(now - executableAt) / 60n} min (stale feed)`);
    }
    return { ...rep, action: "blocked", detail: "stale feed" };
  }
  if (!recipeDue && now < s.nextTrimAt) return { ...rep, action: "cooldown", detail: `next trim at ${s.nextTrimAt}` };

  const values = s.balances.map((bal, i) => (bal * prices[i]!) / 10n ** 8n);
  const noTrim = new Set<number>(), noTopUp = new Set<number>();
  if (mode === "trend" && !recipeDue) {
    for (let i = 0; i < feeds.length; i++) {
      const t = await trendOf(pub, feeds[i]!);
      if (t.known && !t.trimAllowed) noTrim.add(i);
      if (t.known && t.belowMa) noTopUp.add(i);
    }
  }

  let margin = MARGIN_BPS;
  let last: { p: Plan; detail: string } | undefined;
  for (let attempt = 0; attempt < 3; attempt++, margin *= 2) {
    const p = plan({
      values, balances: s.balances, prices, targetBps: targets,
      absBandBps: s.abs, relBandBps: s.rel, capBps: s.cap, marginBps: margin,
      noTrim, noTopUp, minTradeUsd8: recipeDue ? 0n : MIN_TRADE_USD8,
    });
    const desc = `w=[${p.weights.map((x) => (x * 100).toFixed(2)).join(",")}]% -> [${p.desired.map((x) => (x * 100).toFixed(2)).join(",")}]% targets=[${targets.join(",")}]`;
    if (!recipeDue && p.status !== "trade") {
      return { ...rep, action: p.status === "in-band" ? "none" : p.status, detail: p.reason ?? desc };
    }
    if (recipeDue && (p.status === "blocked" || p.status === "infeasible")) return { ...rep, action: p.status, detail: p.reason };
    const trades: Trade[] = p.status === "trade" ? p.trades : [];
    const r = await send(b, "executeRebalance", [trades.map((t) => ({ from: t.from, to: t.to, amountIn: t.amountIn }))]);
    const what = recipeDue ? "recipe" : "trim";
    const tdesc = trades.map((t) => `${t.from}->${t.to}:${t.amountIn}`).join(" ");
    if (r.ok) {
      await alert("info", `rebal:${b}:${now}`, `${s.symbol} ${what} ${r.detail} ${tdesc}${r.tx ? ` tx ${r.tx}` : ""}`);
      return { ...rep, action: DRY_RUN ? `${what}-simulated` : what, detail: `${desc} trades=${tdesc} ${r.detail}`, tx: r.tx };
    }
    last = { p, detail: r.detail };
    // execution cost can push a component just past the edge: retry with a wider margin
    if (!/BandViolation|LossTooHigh/.test(r.detail)) break;
  }
  const msg = `${s.symbol} rebalance failed: ${last?.detail}`;
  if (recipeDue && now - executableAt > BigInt(OVERDUE_SEC)) await alert("error", `overdue:${b}`, `${msg} (recipe overdue)`);
  else await alert("warn", `fail:${b}`, msg);
  return { ...rep, action: "failed", detail: last?.detail };
}

/* ------------------------------------------------------------------ loop */

async function indexerLag(head: bigint) {
  const url = process.env.INDEXER_URL;
  if (!url) return;
  try {
    const st = (await (await fetch(`${url.replace(/\/$/, "")}/status`)).json()) as Record<string, { block?: { number?: number } }>;
    const n = Object.values(st)[0]?.block?.number;
    if (n !== undefined && head - BigInt(n) > BigInt(process.env.INDEXER_LAG_ALERT_BLOCKS || 50)) {
      await alert("warn", "indexer-lag", `indexer is ${head - BigInt(n)} blocks behind`);
    }
  } catch (e) {
    await alert("warn", "indexer-down", `indexer status unreachable: ${decode(e)}`);
  }
}

async function tick() {
  const block = await pub.getBlock();
  const now = block.timestamp;
  const keeper = await pub.readContract({ abi: basketFactoryAbi, address: FACTORY, functionName: "keeper" });
  if (keeperAddr && getAddress(keeper) !== getAddress(keeperAddr)) {
    await alert("error", "not-keeper", `signer ${keeperAddr} is not factory.keeper() ${keeper}; simulations will revert NotKeeper`);
  }
  if (keeperAddr) {
    const bal = await pub.getBalance({ address: keeperAddr });
    if (Number(formatEther(bal)) < LOW_BALANCE_ETH) await alert("warn", "low-balance", `keeper balance ${formatEther(bal)} ETH`);
  }
  await indexerLag(block.number);
  const count = await pub.readContract({ abi: basketFactoryAbi, address: FACTORY, functionName: "basketCount" });
  const reports: BasketReport[] = [];
  for (let i = 0n; i < count; i++) {
    const b = await pub.readContract({ abi: basketFactoryAbi, address: FACTORY, functionName: "allBaskets", args: [i] });
    try {
      const r = await processBasket(b, now);
      reports.push(r);
      console.log(`[keeper] ${r.symbol} ${b} mode=${r.mode} action=${r.action}${r.detail ? ` ${r.detail}` : ""}${r.tx ? ` tx=${r.tx}` : ""}`);
    } catch (e) {
      await alert("warn", `err:${b}`, `${b}: ${decode(e)}`);
    }
  }
  writeState("keeper", { at: new Date().toISOString(), block: block.number, dryRun: DRY_RUN, keeper: keeperAddr ?? null, reports });
}

async function main() {
  const id = await pub.getChainId();
  if (id !== CHAIN_ID) throw new Error(`RPC chainId ${id} != CHAIN_ID ${CHAIN_ID}`);
  console.log(`[keeper] chain ${id} factory ${FACTORY} signer ${keeperAddr ?? "(none: simulate only)"} dryRun=${DRY_RUN} every ${INTERVAL / 1000}s`);
  for (;;) {
    try {
      await tick();
    } catch (e) {
      await alert("error", "tick", `tick failed: ${decode(e)}`);
    }
    if (ONCE) break;
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
