"use client";

/**
 * Adapters from the real write hooks (lib/hooks/use-basket-tx, untouched) to the small shape the trade flows consume.
 * The dev story page swaps these for timed mocks with the same shape.
 */
import { useMemo } from "react";
import type { Address } from "viem";
import { useBuyBasket, useSellBasket, useWithdraw } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/strategy";
import type { BuyTx } from "./BuyFlow";
import type { SellTx } from "./SellFlow";

export function useRealBuyTx(basket: Address): BuyTx {
  const buy = useBuyBasket(basket, { silent: true });
  const { mutateAsync, resetStep } = buy;
  return useMemo(
    () => ({
      step: buy.step,
      shares: buy.result?.shares ?? null,
      run: (usdcIn: bigint) => mutateAsync({ usdcIn, slippageBps: DEFAULT_SLIPPAGE_BPS }),
      reset: resetStep,
    }),
    [buy.step, buy.result, mutateAsync, resetStep],
  );
}

export function useRealSellTx(basket: Address): SellTx {
  const sell = useSellBasket(basket, { silent: true });
  const withdraw = useWithdraw(basket);
  return useMemo(
    () => ({
      sell: {
        step: sell.step,
        out: sell.result?.usdcOut ?? null,
        run: (shares: bigint) => sell.mutateAsync({ shares, slippageBps: DEFAULT_SLIPPAGE_BPS }),
        reset: sell.resetStep,
      },
      withdraw: {
        step: withdraw.step,
        heldMask: withdraw.result?.owedMask ?? null,
        run: (shares: bigint) => withdraw.mutateAsync({ shares }),
        reset: withdraw.resetStep,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sell.step, sell.result, withdraw.step, withdraw.result, sell.mutateAsync, withdraw.mutateAsync],
  );
}
