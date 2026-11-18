"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProposeRecipe } from "@/lib/hooks/use-basket-tx";
import { useWallet } from "@/lib/hooks/use-wallet";
import { TX_STEP_LABEL } from "@/lib/tx";
import type { Address } from "@/lib/types";
import { formatBps, formatUsd6, percentToBps, validateWeightsBps } from "@/lib/units";

export type CreatorBasketSummary = {
  address: Address;
  name: string;
  symbol: string;
  creator: Address;
  aumUsd6: bigint;
  feesEarnedUsd6: bigint;
  followers: number;
  noticeSeconds: number;
  components: { ticker: string; targetBps: number }[];
};

function ProposeForm({ basket }: { basket: CreatorBasketSummary }) {
  const propose = useProposeRecipe(basket.address);
  const [pcts, setPcts] = useState(() => basket.components.map((c) => formatBps(c.targetBps).replace("%", "")));
  const [reason, setReason] = useState("");

  const { bps, errors } = useMemo(() => {
    const out: number[] = [];
    const errs: string[] = [];
    pcts.forEach((p, i) => {
      try {
        out.push(percentToBps(p || "0"));
      } catch {
        errs.push(`${basket.components[i].ticker}: invalid percentage.`);
        out.push(NaN);
      }
    });
    const v = validateWeightsBps(out);
    if (!v.ok) errs.push(...v.errors);
    if (!reason.trim()) errs.push("Add a one-line reason; followers see it.");
    if (reason.length > 140) errs.push("Keep the reason under 140 characters.");
    return { bps: out, errors: errs };
  }, [pcts, reason, basket.components]);

  return (
    <div className="mt-4 space-y-3 rounded-lg bg-[#171717] p-4">
      <p className="text-sm font-semibold">Propose a recipe change</p>
      <p className="text-xs text-gray-500">
        Executes after {basket.noticeSeconds >= 3600 ? `${basket.noticeSeconds / 3600}h` : `${basket.noticeSeconds / 60} min`} notice.
        Followers can exit before then. Set a weight to 0 to phase a stock out.
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {basket.components.map((c, i) => (
          <label key={c.ticker} className="text-xs text-gray-400">
            {c.ticker}
            <Input
              inputMode="decimal"
              value={pcts[i]}
              onChange={(e) => setPcts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              className="mt-1 border-[#2a2a2a] bg-[#111]"
            />
          </label>
        ))}
      </div>
      <Input
        placeholder="Reason (one line), e.g. Trim TSLA after earnings run-up"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="border-[#2a2a2a] bg-[#111]"
      />
      {errors.length > 0 && (
        <ul className="text-xs text-yellow-400">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <Button
        variant="metal"
        size="sm"
        disabled={errors.length > 0 || propose.isPending}
        onClick={() => propose.mutate({ weightsBps: bps, reason: reason.trim() })}
      >
        {propose.isPending ? TX_STEP_LABEL[propose.step] || "Working…" : "Propose change"}
      </Button>
    </div>
  );
}

export function CreatorDashboard({ baskets }: { baskets: CreatorBasketSummary[] }) {
  const wallet = useWallet();
  const [openFor, setOpenFor] = useState<Address | null>(null);

  const mine = wallet.address ? baskets.filter((b) => b.creator.toLowerCase() === wallet.address!.toLowerCase()) : [];
  const demo = mine.length === 0;
  const shown = demo ? baskets.filter((b) => b.creator === baskets[0]?.creator) : mine;
  const totalAum = shown.reduce((a, b) => a + b.aumUsd6, 0n);
  const totalFees = shown.reduce((a, b) => a + b.feesEarnedUsd6, 0n);
  const totalFollowers = shown.reduce((a, b) => a + b.followers, 0);

  return (
    <div className="space-y-8">
      {demo && (
        <p className="rounded border border-yellow-700/50 bg-yellow-900/20 p-3 text-sm text-yellow-300">
          {wallet.address ? "You haven't created a basket yet." : "Sign in to see your baskets."} Showing a demo creator
          (mock data).{" "}
          <Link href="/create" className="underline">
            Create a basket
          </Link>
        </p>
      )}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["AUM", formatUsd6(totalAum, 0)],
          ["Fees earned", formatUsd6(totalFees)],
          ["Followers", String(totalFollowers)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {shown.map((b) => (
          <div key={b.address} className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/b/${b.address}`} className="text-lg font-semibold hover:underline">
                  {b.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {b.symbol} · AUM {formatUsd6(b.aumUsd6, 0)} · fees {formatUsd6(b.feesEarnedUsd6)} · {b.followers} followers
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled={demo} onClick={() => setOpenFor(openFor === b.address ? null : b.address)}>
                {openFor === b.address ? "Close" : "Change recipe"}
              </Button>
            </div>
            {openFor === b.address && <ProposeForm basket={b} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">AI rebalance proposals will appear here for approval (AI-generated, not investment advice).</p>
    </div>
  );
}
