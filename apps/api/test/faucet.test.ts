import request from "supertest";
import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import type { FaucetRelayer } from "../src/modules/faucet/faucet.service";
import { revert } from "./chainMock";
import { buildApp } from "./helpers";

const A = "0x000000000000000000000000000000000000a11c";
const B = "0x000000000000000000000000000000000000b0b0";
const HASH = `0x${"12".repeat(32)}` as const;

function relayer(over: Partial<FaucetRelayer> = {}): FaucetRelayer {
  return {
    faucet: "0xc01Fa45E87785307648987F96026f2dDC899f8C5",
    relayer: "0x0000000000000000000000000000000000000001",
    availableIn: vi.fn(async () => 0),
    drip: vi.fn(async () => HASH),
    ...over,
  };
}

describe("POST /faucet/drip", () => {
  it("returns 501 with a clear message when RELAYER_PK is unset", async () => {
    const res = await request(buildApp({ faucet: null })).post("/faucet/drip").send({ address: A });
    expect(res.status).toBe(501);
    expect(res.body.error).toMatchObject({ code: "faucet_disabled" });
    expect(res.body.error.message).toContain("RELAYER_PK");
  });

  it("relays dripTo and returns the tx hash", async () => {
    const f = relayer();
    const res = await request(buildApp({ faucet: f })).post("/faucet/drip").send({ address: A });
    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ chainId: 84532, txHash: HASH });
    expect(f.drip).toHaveBeenCalledWith(getAddress(A));
  });

  it("validates the body strictly", async () => {
    const app = buildApp({ faucet: relayer() });
    expect((await request(app).post("/faucet/drip").send({ address: "nope" })).status).toBe(400);
    expect((await request(app).post("/faucet/drip").send({ address: A, extra: 1 })).status).toBe(400);
    expect((await request(app).post("/faucet/drip").send({ address: A, chainId: 8453 })).status).toBe(400);
  });

  it("limits each address to 1 drip/day and each IP to N/day", async () => {
    const app = buildApp({
      faucet: relayer(),
      rateLimits: { windowMs: 60_000, globalMax: 1000, writeMax: 1000, waitlistMax: 1000, faucetIpPerDay: 3, faucetAddressPerDay: 1 },
    });
    expect((await request(app).post("/faucet/drip").send({ address: A })).status).toBe(202);
    expect((await request(app).post("/faucet/drip").send({ address: A })).status).toBe(429);
    expect((await request(app).post("/faucet/drip").send({ address: B })).status).toBe(202);
    const ipLimited = await request(app).post("/faucet/drip").send({ address: "0x000000000000000000000000000000000000c0c0" });
    expect(ipLimited.status).toBe(429);
  });

  it("respects the on-chain cooldown and maps reverts", async () => {
    const cooling = buildApp({ faucet: relayer({ availableIn: async () => 3600 }) });
    const r1 = await request(cooling).post("/faucet/drip").send({ address: A });
    expect(r1.status).toBe(429);
    expect(r1.body.error.code).toBe("faucet_cooldown");

    const capped = buildApp({ faucet: relayer({ drip: async () => Promise.reject(revert("DailyCapReached")) }) });
    expect((await request(capped).post("/faucet/drip").send({ address: A })).body.error.code).toBe("faucet_daily_cap");
  });
});
