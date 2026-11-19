"use client";

import { useState } from "react";
import type { BasketView } from "../basket-view";
import { TradeSheet } from "../trade/ui";
import { SellFlow } from "../trade/SellFlow";
import { useRealSellTx } from "../trade/tx";

type Mode = "usdc" | "stocks";

/**
 * Sell sheet (designer sell.html): 25% / 50% / All, the bud pinches off and rolls into your wallet as USDC.
 * Real txs via lib useSellBasket / useWithdraw ("Get the stocks instead"). Props unchanged for BasketScreen.
 */
export function ExitSheet({
  v,
  shares,
  open,
  onOpenChange,
  initialMode = "usdc",
  marketOpen,
}: {
  v: BasketView;
  shares: bigint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialMode?: Mode;
  marketOpen: boolean | null;
}) {
  const tx = useRealSellTx(v.basket.address);
  const [pane, setPane] = useState("compose");
  return (
    <TradeSheet open={open} onOpenChange={onOpenChange} eyebrow="Sell" title={v.basket.name} scrollKey={pane}>
      <SellFlow v={v} shares={shares} tx={tx} initialMode={initialMode} open={open} onDone={() => onOpenChange(false)} marketOpen={marketOpen} onStage={setPane} />
    </TradeSheet>
  );
}
