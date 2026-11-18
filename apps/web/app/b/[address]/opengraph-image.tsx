import { ImageResponse } from "next/og";
import { isAddress, type Address } from "viem";
import { basketNav, getBasket, getPerformance } from "@/lib/data";
import { formatBps, formatUsd6 } from "@/lib/units";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Alloy basket";

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const basket = isAddress(address, { strict: false }) ? await getBasket(address as Address) : null;
  const perf = basket ? await getPerformance(basket) : null;
  const nav = basket ? basketNav(basket) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e0e0e",
          color: "white",
          padding: 64,
          fontSize: 32,
        }}
      >
        <div style={{ display: "flex", fontSize: 36, color: "#bbbbbb" }}>Alloy</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 700 }}>{basket?.name ?? "Basket not found"}</div>
          {basket && (
            <div style={{ display: "flex", marginTop: 16, color: "#999999" }}>
              {basket.components.map((c) => c.stock.ticker).join(" · ")}
            </div>
          )}
        </div>
        {basket && perf && nav && (
          <div style={{ display: "flex", gap: 64 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: perf.followerPnl.bps >= 0 ? "#4ade80" : "#f87171", fontSize: 48 }}>
                {perf.followerPnl.bps >= 0 ? "+" : ""}
                {formatBps(perf.followerPnl.bps)}
              </span>
              <span style={{ color: "#777777", fontSize: 24 }}>Followers, 30d</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48 }}>{formatUsd6(nav.nav, 0)}</span>
              <span style={{ color: "#777777", fontSize: 24 }}>AUM</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48 }}>@{basket.creator.handle}</span>
              <span style={{ color: "#777777", fontSize: 24 }}>Creator</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", fontSize: 18, color: "#666666" }}>
          Tokenized stock exposure. Not available to US persons. Not investment advice.
        </div>
      </div>
    ),
    size,
  );
}
