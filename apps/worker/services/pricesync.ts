/**
 * Price-sync supervisor: runs the testnet-env bot (packages/testnet-env/bot/src/run.ts --once) every
 * PRICE_SYNC_INTERVAL_MIN (default 5) so feeds never go stale (rebalances need rounds <= 25h old; buys/sells only
 * need the DEX) and pools stay arbed to the feed.
 *
 * Mode per tick = priceSyncMode(): a non-expired override set via POST /v1/admin/price-sync wins, else
 * PRICE_SYNC_MODE (mirror | hold | off). "hold" = demo day: keep scenario prices, only heartbeat + arb.
 *
 * Signer for the bot: PRICE_BOT_PK (needs MINT_ROLE on test tokens + feed updater; the testnet deployer) — passed to
 * the child as BOT_PK and never logged. On an unlocked local fork use PRICE_BOT_ADDRESS instead.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { priceSyncMode, writeState } from "../lib/status";

const BOT_DIR = resolve(process.env.PRICE_BOT_DIR || resolve(import.meta.dirname, "../../../packages/testnet-env/bot"));
const INTERVAL = Number(process.env.PRICE_SYNC_INTERVAL_MIN || 5) * 60_000;
const ONCE = process.argv.includes("--once");

function runBot(mode: "mirror" | "hold"): Promise<number> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MODE: mode,
    RPC_URL: (process.env.RPC_URL || "https://sepolia.base.org").split(",")[0],
    // never let the bot fall back to a DEPLOYER_PK from packages/testnet-env/.env: explicit signer only
    DEPLOYER_PK: "",
    BOT_PK: process.env.PRICE_BOT_PK || "",
    BOT_ADDRESS: process.env.PRICE_BOT_ADDRESS || "",
  };
  if (process.env.PRICE_SYNC_DRY_RUN === "true") env.DRY_RUN = "true";
  return new Promise((res) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/run.ts", "--once"], { cwd: BOT_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
    const tag = (d: Buffer) => d.toString().trimEnd().split("\n").map((l) => `[price-sync] ${l}`).join("\n");
    child.stdout.on("data", (d: Buffer) => console.log(tag(d)));
    child.stderr.on("data", (d: Buffer) => console.error(tag(d)));
    child.on("exit", (code) => res(code ?? 1));
  });
}

async function main() {
  console.log(`[price-sync] bot ${BOT_DIR}, every ${INTERVAL / 60_000} min`);
  for (;;) {
    const mode = priceSyncMode();
    let code = 0;
    if (mode === "off") console.log("[price-sync] mode=off, skipping");
    else code = await runBot(mode);
    writeState("pricesync", { at: new Date().toISOString(), mode, exitCode: code });
    if (ONCE) process.exit(code);
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main();
