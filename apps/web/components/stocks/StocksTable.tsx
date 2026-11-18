"use client";

import { DataTable } from "@/components/ui/data-table";
import { bundleColumns, type BundleRow } from "./columns";

export function StocksTable({ rows }: { rows: BundleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-[#0e0e0e] font-chakra">
      <DataTable columns={bundleColumns} data={rows} />
    </div>
  );
}
