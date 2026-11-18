"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UsPersonGate } from "@/components/compliance/UsPersonGate";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isDeployed } from "@/lib/contracts";
import { useBasketPosition } from "@/lib/hooks/use-position";
import { useWallet } from "@/lib/hooks/use-wallet";
import { formatBps, formatShares, formatUsd6, pnl, sharesToUsd6 } from "@/lib/units";
import { BuyDialog, SellDialog, WithdrawDialog, type TradeBasket } from "./TradeDialogs";

type Open = "buy" | "sell" | "withdraw" | null;

export function TradePanel({ basket, feeBps }: { basket: TradeBasket; feeBps: number }) {
  const wallet = useWallet();
  const position = useBasketPosition(basket.address);
  const [open, setOpen] = useState<Open>(null);
  const value = sharesToUsd6(position.shares, basket.nav, basket.totalSupply);
  const ret = position.costUsd6 !== null ? pnl(value, position.costUsd6) : null;
  const live = isDeployed(DEFAULT_CHAIN_ID);

  return (
    <aside className="h-fit space-y-4 rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Your position</p>
        {wallet.address ? (
          <>
            <p className="mt-1 text-2xl font-semibold">{formatUsd6(value)}</p>
            <p className="text-sm text-gray-400">
              {formatShares(position.shares)} {basket.symbol}
              {ret && (
                <span className={ret.usd6 >= 0n ? " text-green-400" : " text-red-400"}>
                  {" "}
                  · {ret.usd6 >= 0n ? "+" : ""}
                  {formatBps(ret.bps)}
                </span>
              )}
            </p>
            {position.mock && <p className="mt-1 text-xs text-yellow-500">Demo position (mock data)</p>}
          </>
        ) : (
          <p className="mt-1 text-sm text-gray-400">Sign in to see your position.</p>
        )}
      </div>

      {!live && (
        <p className="rounded border border-[#2a2a2a] bg-[#171717] p-2 text-xs text-gray-400">
          Contracts are not deployed on this network yet. Trading is disabled.
        </p>
      )}

      {wallet.address ? (
        <UsPersonGate>
          {(run) => (
            <div className="grid gap-2">
              <Button variant="metal" onClick={() => run(() => setOpen("buy"))}>
                Buy
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={position.shares === 0n} onClick={() => run(() => setOpen("sell"))}>
                  Sell
                </Button>
                <Button
                  variant="secondary"
                  disabled={position.shares === 0n}
                  onClick={() => run(() => setOpen("withdraw"))}
                >
                  Withdraw stocks
                </Button>
              </div>
            </div>
          )}
        </UsPersonGate>
      ) : (
        <Button variant="metal" className="w-full" onClick={() => wallet.login()}>
          Sign in to buy
        </Button>
      )}

      <p className="text-xs text-gray-500">
        Min buy $5 · Management fee {formatBps(feeBps)}/yr (paid to the creator and protocol in new basket tokens) · No
        entry or exit fee.
      </p>

      <BuyDialog basket={basket} open={open === "buy"} onOpenChange={(o) => setOpen(o ? "buy" : null)} />
      <SellDialog
        basket={basket}
        balance={position.shares}
        open={open === "sell"}
        onOpenChange={(o) => setOpen(o ? "sell" : null)}
      />
      <WithdrawDialog
        basket={basket}
        balance={position.shares}
        open={open === "withdraw"}
        onOpenChange={(o) => setOpen(o ? "withdraw" : null)}
      />
    </aside>
  );
}
