import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("names missing variables without echoing values", () => {
    expect(() => loadEnv({ MONGO_URI: "mongodb://user:hunter2@host/db" })).toThrow(/ALLOWED_ORIGINS|PRIVY_APP_ID/);
    try {
      loadEnv({ MONGO_URI: "mongodb://user:hunter2@host/db" });
    } catch (e) {
      expect(String(e)).not.toContain("hunter2");
    }
  });

  it("rejects unsupported chain ids and short CRON_SECRET", () => {
    const base = { MONGO_URI: "mongodb://h/db", ALLOWED_ORIGINS: "http://localhost:3000", PRIVY_APP_ID: "a", PRIVY_APP_SECRET: "b" };
    expect(() => loadEnv({ ...base, CHAIN_IDS: "1" })).toThrow(/CHAIN_IDS/);
    expect(() => loadEnv({ ...base, CRON_SECRET: "short" })).toThrow(/CRON_SECRET/);
    expect(loadEnv({ ...base, CRON_SECRET: "" }).CRON_SECRET).toBeUndefined();
    expect(loadEnv(base).CHAIN_IDS).toEqual([8453]);
  });
});
