/**
 * Container entrypoint: supervises the three worker processes and exits non-zero if one dies (Railway restarts the
 * container). Toggle with RUN_INDEXER / RUN_KEEPER / RUN_PRICE_SYNC (default true/true/true).
 *   indexer    ponder start  (HTTP API on PORT, default 42069)
 *   keeper     services/keeper/index.ts
 *   price-sync services/pricesync.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const on = (k: string) => (process.env[k] ?? "true") !== "false";
const tsx = (file: string) => [process.execPath, ["--import", "tsx", file]] as const;

const procs: [string, readonly [string, string[]]][] = [];
if (on("RUN_INDEXER")) {
  const port = process.env.PORT || "42069";
  const schema = process.env.DATABASE_SCHEMA || "alloy";
  procs.push(["indexer", [resolve(root, "node_modules/.bin/ponder"), ["start", "--port", port, "--schema", schema]]]);
  if (!process.env.INDEXER_URL) process.env.INDEXER_URL = `http://127.0.0.1:${port}`;
}
if (on("RUN_KEEPER")) procs.push(["keeper", tsx("services/keeper/index.ts") as never]);
if (on("RUN_PRICE_SYNC")) procs.push(["price-sync", tsx("services/pricesync.ts") as never]);

const children: ChildProcess[] = [];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 5_000).unref();
}
for (const [name, [cmd, args]] of procs) {
  const c = spawn(cmd, args, { cwd: root, stdio: "inherit", env: process.env });
  c.on("exit", (code) => {
    console.error(`[worker] ${name} exited with ${code}`);
    stop(code || 1);
  });
  children.push(c);
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
console.log(`[worker] started: ${procs.map((p) => p[0]).join(", ") || "nothing (all RUN_* false)"}`);
