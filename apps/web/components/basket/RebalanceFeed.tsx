"use client";

import { useEffect, useState } from "react";
import type { RebalanceEvent } from "@/lib/types";
import { formatBps } from "@/lib/units";
import { AI_LABEL } from "@/components/compliance/copy";

function useNow(initial: number) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function countdown(seconds: number) {
  if (seconds <= 0) return "executable now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `executes in ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

const fmt = (t: number) =>
  new Date(t * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

/** What changed, cost, reason, and a countdown for pending recipe changes. */
export function RebalanceFeed({ events, renderedAt }: { events: RebalanceEvent[]; renderedAt: number }) {
  const now = useNow(renderedAt);
  if (events.length === 0) return <p className="text-sm text-gray-500">No rebalances yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((e) => (
        <li key={e.id} className="rounded-lg border border-[#2a2a2a] bg-[#111] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-[#232323] px-2 py-0.5 text-gray-300">
              {e.kind === "drift-trim" ? "Drift trim" : "Recipe change"}
            </span>
            <span
              className={
                e.status === "pending"
                  ? "text-yellow-400"
                  : e.status === "executed"
                    ? "text-green-400"
                    : "text-gray-500"
              }
            >
              {e.status === "pending" && e.executableAt ? countdown(e.executableAt - now) : e.status}
            </span>
            <span className="text-gray-500">{fmt(e.at)}</span>
            {e.costBps !== undefined && <span className="text-gray-500">cost {formatBps(e.costBps)}</span>}
          </div>
          <ul className="mb-2 flex flex-wrap gap-3 text-sm">
            {e.changes.map((c) => (
              <li key={c.symbol} className="text-gray-300">
                {c.symbol}: {formatBps(c.fromBps)} → <span className="text-white">{formatBps(c.toBps)}</span>
              </li>
            ))}
          </ul>
          {e.reason && <p className="text-sm text-gray-400">&ldquo;{e.reason}&rdquo;</p>}
          {e.aiGenerated && <p className="mt-1 text-xs text-yellow-500">{AI_LABEL}</p>}
          {e.status === "pending" && (
            <p className="mt-2 text-xs text-gray-500">Disagree? You can sell or withdraw before it executes.</p>
          )}
        </li>
      ))}
    </ol>
  );
}
