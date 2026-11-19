import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tiny file-based state shared by the processes in the worker container (indexer API, keeper, price-sync).
 * STATUS_DIR defaults to /tmp/alloy-worker (ephemeral; restarts fall back to env defaults).
 */
export const STATUS_DIR = process.env.STATUS_DIR || "/tmp/alloy-worker";

export function readState<T>(name: string): T | null {
  const p = join(STATUS_DIR, `${name}.json`);
  try {
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
  } catch {
    return null;
  }
}

export function writeState(name: string, value: unknown): void {
  mkdirSync(STATUS_DIR, { recursive: true });
  writeFileSync(
    join(STATUS_DIR, `${name}.json`),
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2),
  );
}

export type PriceSyncMode = "mirror" | "hold" | "off";

export interface PriceSyncOverride {
  mode: PriceSyncMode;
  setAt: string;
  /** ISO time after which the override expires and PRICE_SYNC_MODE applies again (optional). */
  until?: string;
}

/** Effective price-sync mode: a non-expired override (POST /v1/admin/price-sync) wins over PRICE_SYNC_MODE. */
export function priceSyncMode(): PriceSyncMode {
  const o = readState<PriceSyncOverride>("pricesync-override");
  if (o && (!o.until || Date.parse(o.until) > Date.now())) return o.mode;
  const env = (process.env.PRICE_SYNC_MODE || "mirror") as PriceSyncMode;
  return env === "hold" || env === "off" ? env : "mirror";
}
