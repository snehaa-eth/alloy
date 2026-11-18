"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MARKET_CLOSED_NOTE } from "@/components/compliance/copy";
import { useBuyBasket, useSellBasket, useWithdraw } from "@/lib/hooks/use-basket-tx";
import { usMarketStatus } from "@/lib/market";
import { DEFAULT_SLIPPAGE_BPS, MIN_BUY_USDC } from "@/lib/strategy";
import { TX_STEP_LABEL, type TxStep } from "@/lib/tx";
import {
  BPS_DENOMINATOR,
  formatB20,
  formatBps,
  formatShares,
  formatUsd6,
  parseUsdc,
  redeemAmounts,
  sharesForPercent,
  sharesToUsd6,
  usd6ToShares,
} from "@/lib/units";
import { cn } from "@/lib/utils";

export type TradeBasket = {
  address: Address;
  name: string;
  symbol: string;
  nav: bigint;
  totalSupply: bigint;
  components: { symbol: string; balance8: bigint }[];
};

type DialogProps = { basket: TradeBasket; open: boolean; onOpenChange: (o: boolean) => void };

const SLIPPAGE_CHOICES = [50, 100, 200];
const PERCENT_CHOICES = [2500, 5000, 7500, BPS_DENOMINATOR];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function StepNote({ step }: { step: TxStep }) {
  if (step === "idle") return null;
  return <p className={cn("text-sm", step === "error" ? "text-red-400" : "text-gray-300")}>{TX_STEP_LABEL[step]}</p>;
}

function MarketNote() {
  const status = usMarketStatus();
  if (status.open) return null;
  return <p className="rounded border border-yellow-700/50 bg-yellow-900/20 p-2 text-xs text-yellow-300">{MARKET_CLOSED_NOTE}</p>;
}

function SlippagePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">Max slippage</span>
      {SLIPPAGE_CHOICES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn("rounded px-2 py-0.5", value === s ? "bg-white text-black" : "bg-[#232323] text-gray-300")}
        >
          {formatBps(s)}
        </button>
      ))}
    </div>
  );
}

function PercentPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PERCENT_CHOICES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn("rounded py-2 text-sm", value === p ? "bg-white text-black" : "bg-[#232323] text-gray-300")}
        >
          {formatBps(p).replace(".00", "")}
        </button>
      ))}
    </div>
  );
}

const contentCls = "border-[#2a2a2a] bg-[#111] text-white font-chakra";

export function BuyDialog({ basket, open, onOpenChange }: DialogProps) {
  const [input, setInput] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_BPS);
  const buy = useBuyBasket(basket.address);

  const parsed = useMemo(() => {
    if (!input) return { amount: null as bigint | null, error: null as string | null };
    try {
      const amount = parseUsdc(input);
      if (amount < MIN_BUY_USDC) return { amount, error: `Minimum is ${formatUsd6(MIN_BUY_USDC)}.` };
      return { amount, error: null };
    } catch (e) {
      return { amount: null, error: (e as Error).message };
    }
  }, [input]);

  const estShares = parsed.amount ? usd6ToShares(parsed.amount, basket.nav, basket.totalSupply) : 0n;
  const busy = buy.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={contentCls}>
        <DialogHeader>
          <DialogTitle>Buy {basket.name}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Pay USDC; the router buys each stock at live DEX prices and mints {basket.symbol} to you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            inputMode="decimal"
            placeholder="Amount in USDC"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border-[#2a2a2a] bg-[#171717]"
          />
          {parsed.error && <p className="text-xs text-red-400">{parsed.error}</p>}
          <SlippagePicker value={slippage} onChange={setSlippage} />
          <Row label="Estimated shares (before quote)" value={`${formatShares(estShares)} ${basket.symbol}`} />
          <MarketNote />
          <StepNote step={buy.step} />
        </div>
        <DialogFooter>
          <Button
            variant="metal"
            disabled={!parsed.amount || !!parsed.error || busy}
            onClick={() => parsed.amount && buy.mutate({ usdcIn: parsed.amount, slippageBps: slippage })}
          >
            {busy ? TX_STEP_LABEL[buy.step] || "Working…" : "Buy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SellDialog({ basket, open, onOpenChange, balance }: DialogProps & { balance: bigint }) {
  const [pct, setPct] = useState(5000);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_BPS);
  const sell = useSellBasket(basket.address);
  const shares = sharesForPercent(balance, pct);
  const estUsdc = sharesToUsd6(shares, basket.nav, basket.totalSupply);
  const busy = sell.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={contentCls}>
        <DialogHeader>
          <DialogTitle>Sell {basket.symbol}</DialogTitle>
          <DialogDescription className="text-gray-400">Sell any percentage for USDC at live DEX prices.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <PercentPicker value={pct} onChange={setPct} />
          <SlippagePicker value={slippage} onChange={setSlippage} />
          <Row label="Shares to sell" value={`${formatShares(shares)} of ${formatShares(balance)}`} />
          <Row label="Estimated USDC (NAV, before quote)" value={formatUsd6(estUsdc)} />
          <MarketNote />
          <StepNote step={sell.step} />
        </div>
        <DialogFooter>
          <Button
            variant="metal"
            disabled={shares === 0n || busy}
            onClick={() => sell.mutate({ shares, slippageBps: slippage })}
          >
            {busy ? TX_STEP_LABEL[sell.step] || "Working…" : "Sell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WithdrawDialog({ basket, open, onOpenChange, balance }: DialogProps & { balance: bigint }) {
  const [pct, setPct] = useState(BPS_DENOMINATOR);
  const withdraw = useWithdraw(basket.address);
  const shares = sharesForPercent(balance, pct);
  const amounts = redeemAmounts(
    basket.components.map((c) => c.balance8),
    shares > basket.totalSupply ? basket.totalSupply : shares,
    basket.totalSupply,
  );
  const busy = withdraw.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={contentCls}>
        <DialogHeader>
          <DialogTitle>Withdraw stocks in-kind</DialogTitle>
          <DialogDescription className="text-gray-400">
            Burn {basket.symbol} and receive the underlying stock tokens directly. No swaps, no oracle; always available,
            even when the market is closed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <PercentPicker value={pct} onChange={setPct} />
          <Row label="Shares to burn" value={formatShares(shares)} />
          <div className="rounded bg-[#171717] p-3">
            {basket.components.map((c, i) => (
              <Row key={c.symbol} label={c.symbol} value={formatB20(amounts[i])} />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            If a token&apos;s transfer policy blocks delivery, that amount is credited to you and can be claimed later.
          </p>
          <StepNote step={withdraw.step} />
        </div>
        <DialogFooter>
          <Button variant="metal" disabled={shares === 0n || busy} onClick={() => withdraw.mutate({ shares })}>
            {busy ? TX_STEP_LABEL[withdraw.step] || "Working…" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
