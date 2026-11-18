import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { BASE_MAINNET_UNIVERSE } from "../src/config/universe";
import { buildApp, testEnv } from "./helpers";

const NVDA = BASE_MAINNET_UNIVERSE.find((s) => s.symbol === "NVDAc")!;

function coinbaseFetch() {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({
        tokens: [
          {
            contract_address: NVDA.address.toLowerCase(),
            symbol: "NVDAc",
            name: "NVIDIA Corporation",
            decimals: 8,
            icon_url: "https://metadata.coinbase.com/x.png",
            isin: "US67066G1040",
            multiplier: 1,
          },
          { contract_address: "0xb20000000000000000000006f910a0e7BBD3c168", symbol: "APPc", decimals: 8 },
          { garbage: true },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  ) as unknown as typeof fetch;
}

describe("GET /stocks", () => {
  it("returns only the v2 universe for Base, enriched from Coinbase, and caches", async () => {
    const fetchMock = coinbaseFetch();
    const app = buildApp({ fetch: fetchMock });

    const res = await request(app).get("/stocks?chainId=8453");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(BASE_MAINNET_UNIVERSE.length);
    const symbols = res.body.data.map((s: { symbol: string }) => s.symbol);
    expect(symbols).not.toContain("APPc");
    const nvda = res.body.data.find((s: { symbol: string }) => s.symbol === "NVDAc");
    expect(nvda).toMatchObject({ chainId: 8453, address: NVDA.address, name: "NVIDIA Corporation", decimals: 8, listed: true });
    expect(res.body.data.find((s: { symbol: string }) => s.symbol === "TSLAc").listed).toBe(false);

    await request(app).get("/stocks"); // default chain = 8453
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a generic 502 when upstream fails and nothing is cached", async () => {
    const app = buildApp({ fetch: vi.fn(async () => new Response("boom internal detail", { status: 500 })) as never });
    const res = await request(app).get("/stocks");
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("upstream_unavailable");
    expect(JSON.stringify(res.body)).not.toMatch(/coinbase|boom|500/i);
  });

  it("rejects unsupported chain ids", async () => {
    const res = await request(buildApp()).get("/stocks?chainId=1");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("reads Base Sepolia stocks from TESTNET_DEPLOYMENTS_PATH", async () => {
    const dir = mkdtempSync(join(tmpdir(), "alloy-api-"));
    const file = join(dir, "deployments.json");
    writeFileSync(file, JSON.stringify({ stocks: [{ symbol: "tNVDA", address: "0x" + "ab".repeat(20) }] }));
    const app = buildApp({ env: testEnv({ TESTNET_DEPLOYMENTS_PATH: file }) });
    const res = await request(app).get("/stocks?chainId=84532");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ chainId: 84532, symbol: "tNVDA", decimals: 8 })]);
  });

  it("returns an empty list for Base Sepolia when no deployments file is configured", async () => {
    const res = await request(buildApp()).get("/stocks?chainId=84532");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
