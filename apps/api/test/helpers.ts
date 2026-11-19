import { vi } from "vitest";
import type { Address } from "viem";
import { createApp } from "../src/app";
import { loadEnv, type Env } from "../src/config/env";
import type { AppDeps } from "../src/deps";
import type { AuthVerifier } from "../src/lib/auth";
import type { CreatorReader } from "../src/lib/chain";
import { mockChain } from "./chainMock";

export const CREATOR: Address = "0x1111111111111111111111111111111111111111";
export const STRANGER: Address = "0x2222222222222222222222222222222222222222";
export const VAULT: Address = "0x3333333333333333333333333333333333333333";
export const SERVICE_KEY = "s".repeat(40);

export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: "test",
    MONGO_URI: "mongodb://127.0.0.1:1/alloy-test",
    CHAIN_IDS: "8453,84532",
    ALLOWED_ORIGINS: "http://localhost:3000,https://crates-ui.vercel.app",
    PRIVY_APP_ID: "test-app",
    PRIVY_APP_SECRET: "test-secret",
    INVITE_CODES: "ALPHA1,BETA22",
    CRON_SECRET: SERVICE_KEY,
    ...overrides,
  });
}

/** Tokens: "creator" -> wallet CREATOR, "stranger" -> STRANGER, anything else -> invalid. */
export const stubAuth: AuthVerifier = {
  async verify(token) {
    if (token === "creator") return { userId: "did:privy:creator", wallets: [CREATOR] };
    if (token === "stranger") return { userId: "did:privy:stranger", wallets: [STRANGER] };
    throw new Error("invalid token");
  },
};

export const stubCreators: CreatorReader = {
  async getCreator(_chainId, vault) {
    return vault.toLowerCase() === VAULT.toLowerCase() ? CREATOR : null;
  },
};

export function buildApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    env: testEnv(),
    auth: stubAuth,
    creators: stubCreators,
    connectDb: async () => undefined,
    chain: mockChain({}),
    faucet: null,
    basketMeta: { byChain: async () => new Map() },
    fetch: vi.fn() as unknown as typeof fetch,
    rateLimits: { windowMs: 60_000, globalMax: 10_000, writeMax: 10_000, waitlistMax: 10_000 },
    ...overrides,
  });
}

/** Minimal stand-in for a mongoose Query: chainable and thenable. */
export function fakeQuery<T>(result: T | Error) {
  const q: Record<string, unknown> = {};
  for (const m of ["sort", "skip", "limit", "lean", "select"]) q[m] = () => q;
  q.then = (res: (v: T) => unknown, rej: (e: unknown) => unknown) =>
    result instanceof Error ? Promise.reject(result).then(res, rej) : Promise.resolve(result).then(res, rej);
  return q as never;
}
