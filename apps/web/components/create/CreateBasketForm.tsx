"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UsPersonGate } from "@/components/compliance/UsPersonGate";
import { useCreateBasket } from "@/lib/hooks/use-basket-tx";
import { useWallet } from "@/lib/hooks/use-wallet";
import {
  DEFAULT_FEE_BPS,
  DEFAULT_SLIPPAGE_BPS,
  MAX_FEE_BPS,
  MIN_SEED_USDC,
  STRATEGY_MODES,
  STRATEGY_MODE_LIST,
} from "@/lib/strategy";
import { TX_STEP_LABEL } from "@/lib/tx";
import type { Stock, StrategyMode } from "@/lib/types";
import {
  BPS_DENOMINATOR,
  MAX_COMPONENTS,
  equalWeightsBps,
  formatBps,
  formatUsd6,
  parseUsdc,
  percentToBps,
  validateWeightsBps,
} from "@/lib/units";
import { cn } from "@/lib/utils";

const FEE_CHOICES = [50, 100, 150, MAX_FEE_BPS];
const bpsToInput = (bps: number) => formatBps(bps).replace("%", "");

type Row = { ticker: string; pct: string };

export function CreateBasketForm({ stocks }: { stocks: Stock[] }) {
  const wallet = useWallet();
  const create = useCreateBasket();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [thesis, setThesis] = useState("");
  const [mode, setMode] = useState<StrategyMode>("balanced");
  const [feeBps, setFeeBps] = useState(DEFAULT_FEE_BPS);
  const [seed, setSeed] = useState("10");
  const [demo, setDemo] = useState(false);

  const bySymbol = useMemo(() => new Map(stocks.map((s) => [s.ticker, s])), [stocks]);

  const weights = useMemo(() => {
    const bps: number[] = [];
    const parseErrors: string[] = [];
    for (const r of rows) {
      try {
        bps.push(percentToBps(r.pct || "0"));
      } catch {
        parseErrors.push(`${r.ticker}: use a percentage with at most 2 decimals.`);
        bps.push(NaN);
      }
    }
    const v = validateWeightsBps(bps);
    const sum = bps.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    return { bps, sum, errors: [...parseErrors, ...(v.ok ? [] : v.errors)] };
  }, [rows]);

  const seedParsed = useMemo(() => {
    try {
      const v = parseUsdc(seed);
      return v < MIN_SEED_USDC ? { v, err: `Minimum seed is ${formatUsd6(MIN_SEED_USDC)}.` } : { v, err: null };
    } catch (e) {
      return { v: 0n, err: (e as Error).message };
    }
  }, [seed]);

  const metaErrors = [
    !name.trim() && "Name is required.",
    !/^[A-Za-z0-9]{2,8}$/.test(symbol) && "Symbol: 2–8 letters or digits.",
    thesis.trim().length < 20 && "Thesis: at least 20 characters.",
  ].filter(Boolean) as string[];

  const allErrors = [...weights.errors, ...metaErrors, ...(seedParsed.err ? [seedParsed.err] : [])];

  function toggle(ticker: string) {
    setRows((prev) =>
      prev.some((r) => r.ticker === ticker)
        ? prev.filter((r) => r.ticker !== ticker)
        : prev.length >= MAX_COMPONENTS
          ? prev
          : [...prev, { ticker, pct: "" }],
    );
  }

  function splitEqually() {
    const eq = equalWeightsBps(rows.length);
    setRows((prev) => prev.map((r, i) => ({ ...r, pct: bpsToInput(eq[i]) })));
  }

  function submit() {
    create.mutate({
      name: name.trim(),
      symbol: symbol.trim(),
      components: rows.map((r) => bySymbol.get(r.ticker)!.token),
      targetBps: weights.bps,
      mode,
      feeBps,
      demo,
      usdcSeed: seedParsed.v,
      slippageBps: DEFAULT_SLIPPAGE_BPS,
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section>
          <h2 className="mb-1 text-lg font-semibold">1. Pick stocks</h2>
          <p className="mb-3 text-sm text-gray-500">Up to {MAX_COMPONENTS}. Only stocks with a price feed and a liquid pool are listed.</p>
          <div className="flex flex-wrap gap-2">
            {stocks.map((s) => {
              const on = rows.some((r) => r.ticker === s.ticker);
              return (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => toggle(s.ticker)}
                  className={cn(
                    "rounded border px-3 py-1.5 text-sm transition-colors",
                    on ? "border-white bg-white text-black" : "border-[#2a2a2a] bg-[#171717] text-gray-300 hover:border-[#444]",
                  )}
                >
                  {s.ticker}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">2. Set weights</h2>
            <Button type="button" size="sm" variant="secondary" disabled={rows.length === 0} onClick={splitEqually}>
              Split equally
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">Pick at least one stock.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.ticker} className="flex items-center gap-3">
                  <span className="w-20 text-sm">{r.ticker}</span>
                  <Input
                    inputMode="decimal"
                    value={r.pct}
                    placeholder="0.00"
                    onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))}
                    className="w-28 border-[#2a2a2a] bg-[#171717]"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <span className="text-xs text-gray-600">{Number.isFinite(weights.bps[i]) ? `${weights.bps[i]} bps` : ""}</span>
                  <button type="button" aria-label={`Remove ${r.ticker}`} onClick={() => toggle(r.ticker)} className="ml-auto text-gray-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <p className={cn("text-sm", weights.sum === BPS_DENOMINATOR ? "text-green-400" : "text-yellow-400")}>
                Total {formatBps(weights.sum)} (must be exactly 100.00%)
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">3. Strategy</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {STRATEGY_MODE_LIST.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  mode === m ? "border-white bg-[#1b1b1b]" : "border-[#2a2a2a] bg-[#111] hover:border-[#444]",
                )}
              >
                <p className="font-semibold">{STRATEGY_MODES[m].label}</p>
                <p className="mt-1 text-xs text-gray-400">{STRATEGY_MODES[m].oneLiner}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. Details</h2>
          <Input placeholder="Basket name, e.g. AI Leaders" value={name} onChange={(e) => setName(e.target.value)} className="border-[#2a2a2a] bg-[#171717]" />
          <Input placeholder="Symbol, e.g. AIL" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="border-[#2a2a2a] bg-[#171717]" />
          <Textarea
            placeholder="Thesis: why these stocks, in one or two sentences."
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            className="border-[#2a2a2a] bg-[#171717]"
          />
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-xl border border-[#2a2a2a] bg-[#111] p-5 lg:sticky lg:top-24">
        <div>
          <p className="mb-2 text-sm text-gray-400">Management fee (per year, fixed forever)</p>
          <div className="grid grid-cols-4 gap-2">
            {FEE_CHOICES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFeeBps(f)}
                className={cn("rounded py-1.5 text-sm", feeBps === f ? "bg-white text-black" : "bg-[#232323] text-gray-300")}
              >
                {formatBps(f)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">80% to you, 20% to the protocol, paid in new basket tokens.</p>
        </div>
        <div>
          <p className="mb-2 text-sm text-gray-400">Seed (USDC, min {formatUsd6(MIN_SEED_USDC, 0)})</p>
          <Input inputMode="decimal" value={seed} onChange={(e) => setSeed(e.target.value)} className="border-[#2a2a2a] bg-[#171717]" />
          <p className="mt-1 text-xs text-gray-500">About 0.1% of the seed is locked forever to protect the share price.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-300">
          <Checkbox checked={demo} onCheckedChange={(c) => setDemo(c === true)} className="mt-0.5 border-[#A1A1A1]" />
          <span>Demo basket (10-minute recipe notice instead of 24h; shown publicly as &ldquo;Demo&rdquo;)</span>
        </label>

        {allErrors.length > 0 && (
          <ul className="space-y-1 text-xs text-yellow-400">
            {allErrors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}

        {wallet.address ? (
          <UsPersonGate>
            {(run) => (
              <Button variant="metal" className="w-full" disabled={allErrors.length > 0 || create.isPending} onClick={() => run(submit)}>
                {create.isPending ? TX_STEP_LABEL[create.step] || "Working…" : "Create & seed basket"}
              </Button>
            )}
          </UsPersonGate>
        ) : (
          <Button variant="metal" className="w-full" onClick={() => wallet.login()}>
            Sign in to create
          </Button>
        )}
        <p className="text-xs text-gray-500">
          You are responsible for your thesis. Don&apos;t promise returns. Story baskets must cite their public source and date.
        </p>
      </aside>
    </div>
  );
}
