"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBasketPosition } from "@/lib/hooks/use-position";
import { useWallet } from "@/lib/hooks/use-wallet";
import type { Address } from "@/lib/types";
import { formatBps, formatShares, formatUsd6, pnl, sharesToUsd6 } from "@/lib/units";

export type PortfolioBasket = { address: Address; name: string; symbol: string; nav: bigint; totalSupply: bigint };

function PositionRow({ basket }: { basket: PortfolioBasket }) {
  const pos = useBasketPosition(basket.address);
  if (pos.shares === 0n) return null;
  const value = sharesToUsd6(pos.shares, basket.nav, basket.totalSupply);
  const ret = pos.costUsd6 !== null ? pnl(value, pos.costUsd6) : null;
  return (
    <Link
      href={`/b/${basket.address}`}
      className="grid grid-cols-2 gap-2 rounded-lg border border-[#2a2a2a] bg-[#111] p-4 hover:border-[#444] md:grid-cols-4"
    >
      <div>
        <p className="font-semibold">{basket.name}</p>
        <p className="text-xs text-gray-500">
          {formatShares(pos.shares)} {basket.symbol}
          {pos.mock && <span className="text-yellow-500"> · mock</span>}
        </p>
      </div>
      <div>
        <p>{formatUsd6(value)}</p>
        <p className="text-xs text-gray-500">Value (NAV)</p>
      </div>
      <div>
        <p>{pos.costUsd6 !== null ? formatUsd6(pos.costUsd6) : "—"}</p>
        <p className="text-xs text-gray-500">Net invested</p>
      </div>
      <div>
        <p className={!ret ? "" : ret.usd6 >= 0n ? "text-green-400" : "text-red-400"}>
          {ret ? `${ret.usd6 >= 0n ? "+" : ""}${formatUsd6(ret.usd6)} (${formatBps(ret.bps)})` : "—"}
        </p>
        <p className="text-xs text-gray-500">PnL</p>
      </div>
    </Link>
  );
}

export function PortfolioView({ baskets }: { baskets: PortfolioBasket[] }) {
  const wallet = useWallet();
  if (!wallet.ready) return <p className="text-gray-500">Loading…</p>;
  if (!wallet.address) {
    return (
      <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-8 text-center">
        <p className="mb-4 text-gray-400">Sign in to see your baskets.</p>
        <Button variant="metal" onClick={() => wallet.login()}>
          Sign in
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {baskets.map((b) => (
        <PositionRow key={b.address} basket={b} />
      ))}
      <p className="pt-2 text-xs text-gray-500">
        Values use oracle NAV; what you receive when selling depends on live DEX prices. In-kind withdraw is always available
        from each basket page.
      </p>
    </div>
  );
}
