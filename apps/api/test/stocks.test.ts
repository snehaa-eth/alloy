import { getAddress } from "viem";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { BASE_MAINNET_UNIVERSE } from "../src/config/universe";
import { S, mockChain } from "./chainMock";
import { buildApp } from "./helpers";

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

  it("serves Base Sepolia test stocks from @alloy/sdk with feed prices and real-ticker icons", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          tokens: [{ contract_address: NVDA.address, symbol: "NVDAc", icon_url: "https://metadata.coinbase.com/nvda.png" }],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    const chain = mockChain({ latestRoundData: [1n, 151_36187976n, 0n, 1_795_000_000n, 1n] });
    const res = await request(buildApp({ fetch: fetchMock, chain })).get("/stocks?chainId=84532");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    const nvda = res.body.data.find((s: { symbol: string }) => s.symbol === "tNVDAc");
    expect(nvda).toMatchObject({
      chainId: 84532,
      address: getAddress(S.tNVDAc.token),
      decimals: 8,
      iconUrl: "https://metadata.coinbase.com/nvda.png",
      testnet: { underlying: "NVDA", feed: S.tNVDAc.feed, pool: S.tNVDAc.pool, allowed: true, priceUsd8: "15136187976", price: 151.36187976 },
    });
    expect(res.body.data.find((s: { symbol: string }) => s.symbol === "tTSLAc").iconUrl).toBeNull();
  });

  it("still lists Base Sepolia stocks when icons and feeds are unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    const res = await request(buildApp({ fetch: fetchMock })).get("/stocks?chainId=84532");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data[0].testnet.price).toBeNull();
  });
});
