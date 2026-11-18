import Link from "next/link";
import type { Basket, Performance } from "@/lib/types";
import { basketNav } from "@/lib/data";
import { formatBps, formatUsd6 } from "@/lib/units";
import { StrategyBadge } from "./StrategyBadge";

/** Explore-grid card (server component; formerly CrateCard). */
export function BasketCard({ basket, performance }: { basket: Basket; performance: Performance }) {
  const { nav } = basketNav(basket);
  const ret = performance.followerPnl.bps;
  return (
    <Link
      href={`/b/${basket.address}`}
      className="block rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 p-5 shadow-lg transition-all hover:-translate-y-0.5 hover:border-[#3a3a3a] hover:shadow-2xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold leading-snug text-white">{basket.name}</h3>
          <p className="text-xs text-gray-500">by @{basket.creator.handle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StrategyBadge mode={basket.mode} />
          {basket.demo && <span className="text-[10px] uppercase tracking-wide text-yellow-400">Demo basket</span>}
        </div>
      </div>
      <p className="mb-5 line-clamp-2 text-sm text-gray-400">{basket.thesis}</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {basket.components.map((c) => (
          <span key={c.stock.symbol} className="rounded bg-[#232323] px-2 py-0.5 text-xs text-gray-300">
            {c.stock.ticker} {formatBps(c.targetBps).replace(".00", "")}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className={ret >= 0 ? "text-lg font-semibold text-green-400" : "text-lg font-semibold text-red-400"}>
            {ret >= 0 ? "+" : ""}
            {formatBps(ret)}
          </p>
          <p className="text-xs text-gray-500">Follower return (30d)</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{formatUsd6(nav, 0)}</p>
          <p className="text-xs text-gray-500">AUM</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{basket.followers}</p>
          <p className="text-xs text-gray-500">Followers</p>
        </div>
      </div>
    </Link>
  );
}
