#!/usr/bin/env node
/**
 * Runner: loads a seeded TESTNET follower key from packages/testnet-env/.env.seed (gitignored) into E2E_PK for the
 * child process only, picks an RPC, then runs Playwright. Never prints the key.
 *   node e2e/run.mjs [playwright args]      (E2E_FOLLOWER=1..7 picks the wallet, default 1)
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const parse = (p) =>
  existsSync(p)
    ? Object.fromEntries(
        readFileSync(p, "utf8")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#") && l.includes("="))
          .map((l) => {
            const i = l.indexOf("=");
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
          }),
      )
    : {};
const seed = parse(resolve(here, "../../../packages/testnet-env/.env.seed"));
const local = parse(resolve(here, "../.env.local"));
const n = process.env.E2E_FOLLOWER || "1";
const env = { ...process.env };
if (seed[`FOLLOWER_${n}_PK`]) {
  env.E2E_PK = seed[`FOLLOWER_${n}_PK`];
  env.E2E_ADDR = seed[`FOLLOWER_${n}_ADDR`];
} else console.warn("No seeded follower key found; wallet tests will be skipped.");
env.E2E_RPC = process.env.E2E_RPC || local.RPC_URL_84532 || "https://sepolia.base.org";
const r = spawnSync("npx", ["playwright", "test", "-c", "e2e/playwright.config.ts", ...process.argv.slice(2)], {
  cwd: resolve(here, ".."),
  env,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
