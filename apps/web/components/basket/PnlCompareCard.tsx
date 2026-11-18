import type { Performance } from "@/lib/types";
import { formatBps, formatUsd6 } from "@/lib/units";

function Side({ title, usd6, bps, hint }: { title: string; usd6: bigint; bps: number; hint: string }) {
  const up = usd6 >= 0n;
  return (
    <div className="rounded-lg bg-[#171717] p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
        {up ? "+" : ""}
        {formatBps(bps)}
      </p>
      <p className="text-sm text-gray-400">
        {up ? "+" : ""}
        {formatUsd6(usd6)}
      </p>
      <p className="mt-2 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

/** Follower PnL next to creator PnL (answers "leaders win, followers lose"). */
export function PnlCompareCard({ performance }: { performance: Performance }) {
  const gap = performance.creatorPnl.bps - performance.followerPnl.bps;
  return (
    <section className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
      <h3 className="mb-3 text-lg font-semibold">Followers vs creator</h3>
      <div className="grid grid-cols-2 gap-3">
        <Side
          title="Followers (avg)"
          usd6={performance.followerPnl.usd6}
          bps={performance.followerPnl.bps}
          hint="Money-weighted across all followers"
        />
        <Side
          title="Creator"
          usd6={performance.creatorPnl.usd6}
          bps={performance.creatorPnl.bps}
          hint="Creator's own stake, excluding fees"
        />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Gap: {gap >= 0 ? "+" : ""}
        {formatBps(gap)} in the creator&apos;s favour · Max drawdown {formatBps(performance.maxDrawdownBps)} · Creator
        fees earned {formatUsd6(performance.feesEarnedUsd6)}
      </p>
    </section>
  );
}
