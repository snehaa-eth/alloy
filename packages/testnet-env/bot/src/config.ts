import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress, type Address, type Hex } from "viem";

/** packages/testnet-env */
export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type PriceSource = "coinbase" | "chainlink";
export type MirrorMode = "mirror" | "hold";

export interface BotConfig {
  /** Base Sepolia (or local fork) RPC. */
  rpcUrl: string;
  /** Base mainnet RPC (only for PRICE_SOURCE=chainlink). */
  mainnetRpcUrl: string;
  deploymentsPath: string;
  /** Signer: a private key (BOT_PK, falls back to DEPLOYER_PK) ... */
  privateKey?: Hex;
  /** ... or an address unlocked on the node (local base-anvil fork). */
  unlockedAddress?: Address;
  dryRun: boolean;
  /** Daemon interval. */
  intervalMinutes: number;
  /** mirror = follow real prices; hold = keep current (scenario) prices, only refresh heartbeat + arb. */
  mode: MirrorMode;
  priceSource: PriceSource;
  /** Push to feed when |real - feed| >= this many bps. */
  deviationBps: number;
  /** Re-push the same price when the last round is older than this (0 = never). Keeps Alloy's 25h guard happy. */
  heartbeatHours: number;
  /** Arb the pool when |pool - feed| > this many bps (10 = 0.1%). */
  arbToleranceBps: number;
  /** Skip arbitrage entirely. */
  noArb: boolean;
  /** Mainnet Chainlink feeds, underlying ticker -> aggregator (config/mainnet-feeds.json). */
  mainnetFeeds: Record<string, Address>;
}

function envNum(name: string, dflt: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return dflt;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number, got "${v}"`);
  return n;
}

function envBool(name: string): boolean {
  const v = (process.env[name] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Load packages/testnet-env/.env (DEPLOYER_PK, BASE_SEPOLIA_RPC, ...) without overriding the real environment. */
export function loadDotEnv(): void {
  const p = resolve(PKG_ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const key = m[1]!;
    const val = m[2]!.replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function loadConfig(argv: string[] = process.argv.slice(2)): BotConfig {
  loadDotEnv();
  const flag = (f: string) => argv.includes(f);
  const opt = (f: string) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const pkRaw = process.env.BOT_PK || process.env.DEPLOYER_PK;
  let privateKey: Hex | undefined;
  if (pkRaw) {
    const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hex;
    if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error("BOT_PK / DEPLOYER_PK must be a 32-byte hex private key");
    privateKey = pk;
  }
  const unlockedRaw = process.env.BOT_ADDRESS;
  if (unlockedRaw && !isAddress(unlockedRaw, { strict: false })) throw new Error(`BOT_ADDRESS is not an address: ${unlockedRaw}`);

  const mode = (opt("--mode") ?? process.env.MODE ?? "mirror") as MirrorMode;
  if (mode !== "mirror" && mode !== "hold") throw new Error(`MODE must be mirror|hold, got ${mode}`);
  const priceSource = (process.env.PRICE_SOURCE ?? "coinbase") as PriceSource;
  if (priceSource !== "coinbase" && priceSource !== "chainlink") {
    throw new Error("PRICE_SOURCE must be coinbase|chainlink");
  }

  const deploymentsPath = resolve(
    opt("--deployments") ?? process.env.DEPLOYMENTS ?? resolve(PKG_ROOT, "deployments", "84532.json"),
  );

  const feedsPath = resolve(PKG_ROOT, "config", "mainnet-feeds.json");
  const mainnetFeeds: Record<string, Address> = {};
  if (existsSync(feedsPath)) {
    const raw = JSON.parse(readFileSync(feedsPath, "utf8")) as { feeds?: Record<string, string> };
    for (const [k, v] of Object.entries(raw.feeds ?? {})) if (v && isAddress(v, { strict: false })) mainnetFeeds[k] = getAddress(v);
  }

  return {
    rpcUrl: process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    mainnetRpcUrl: process.env.MAINNET_RPC_URL ?? "https://mainnet.base.org",
    deploymentsPath,
    privateKey,
    unlockedAddress: unlockedRaw ? getAddress(unlockedRaw) : undefined,
    dryRun: flag("--dry-run") || envBool("DRY_RUN"),
    intervalMinutes: envNum("INTERVAL_MIN", 5),
    mode,
    priceSource,
    deviationBps: envNum("DEVIATION_BPS", 10),
    heartbeatHours: envNum("HEARTBEAT_HOURS", 12),
    arbToleranceBps: envNum("ARB_TOLERANCE_BPS", 10),
    noArb: flag("--no-arb") || envBool("NO_ARB"),
    mainnetFeeds,
  };
}
