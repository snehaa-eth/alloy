"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NavPoint } from "@/lib/types";
import { usd6ToChartNumber } from "@/lib/units";
import { PAST_PERFORMANCE } from "@/components/compliance/copy";

const fmtDate = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function NavChart({ series }: { series: NavPoint[] }) {
  // Numbers are for drawing only; never feed them back into money math.
  const data = series.map((p) => ({ t: p.t, nav: usd6ToChartNumber(p.navPerShareUsd6) }));
  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EBEBEB" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EBEBEB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tickFormatter={fmtDate} stroke="#555" fontSize={11} minTickGap={32} />
            <YAxis
              stroke="#555"
              fontSize={11}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={60}
            />
            <Tooltip
              labelFormatter={(t) => fmtDate(Number(t))}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "NAV / share"]}
              contentStyle={{ background: "#1e1e1e", border: "none", borderRadius: 6 }}
            />
            <Area type="monotone" dataKey="nav" stroke="#EBEBEB" strokeWidth={2} fill="url(#navFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-gray-500">{PAST_PERFORMANCE}</p>
    </div>
  );
}
