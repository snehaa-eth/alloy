"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatB20, formatBps, formatPrice8, formatUsd6 } from "@/lib/units";

/** One row of a basket's bundle. Amounts are bigint; formatted at render time. */
export type BundleRow = {
  symbol: string;
  ticker: string;
  name: string;
  price8: bigint;
  balance8: bigint;
  valueUsd6: bigint;
  targetBps: number;
  currentBps: number;
};

export const bundleColumns: ColumnDef<BundleRow>[] = [
  {
    header: "Stock",
    cell: ({ row }) => (
      <div>
        <p className="text-white">{row.original.ticker}</p>
        <p className="text-xs text-gray-500">
          {row.original.name} · {row.original.symbol}
        </p>
      </div>
    ),
  },
  { header: "Price", cell: ({ row }) => formatPrice8(row.original.price8) },
  { header: "Held by vault", cell: ({ row }) => formatB20(row.original.balance8) },
  { header: "Value", cell: ({ row }) => formatUsd6(row.original.valueUsd6) },
  { header: "Target", cell: ({ row }) => formatBps(row.original.targetBps) },
  {
    header: "Current",
    cell: ({ row }) => {
      const drift = row.original.currentBps - row.original.targetBps;
      return (
        <span>
          {formatBps(row.original.currentBps)}{" "}
          <span className={drift === 0 ? "text-gray-500" : drift > 0 ? "text-green-400" : "text-red-400"}>
            ({drift >= 0 ? "+" : ""}
            {formatBps(drift)})
          </span>
        </span>
      );
    },
  },
];
