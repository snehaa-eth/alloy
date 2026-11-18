"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatBps } from "@/lib/units";

const COLORS = ["#7ed957", "#8664ff", "#57c0ff", "#d9d9d9", "#5871f5", "#ff6b6b", "#f5a623", "#00c49f", "#ffbb28", "#0088fe"];

export type DonutSlice = { label: string; sublabel?: string; bps: number };

export function DonutChartWithLegend({ slices }: { slices: DonutSlice[] }) {
  const data = slices.map((s, i) => ({ name: s.label, value: s.bps, color: COLORS[i % COLORS.length] }));
  return (
    <div className="grid w-full gap-6 rounded-xl bg-[#171717] p-6 md:grid-cols-2">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={100} paddingAngle={4} strokeWidth={0}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatBps(Number(v))}
              contentStyle={{ background: "#1e1e1e", border: "none", borderRadius: "6px" }}
              itemStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col justify-center text-sm text-white">
        {slices.map((s, i) => (
          <div key={s.label} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span>
                {s.label}
                {s.sublabel && <span className="text-gray-500"> · {s.sublabel}</span>}
              </span>
            </div>
            <span className="text-gray-400">{formatBps(s.bps)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
