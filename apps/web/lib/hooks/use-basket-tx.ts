"use client";

/**
 * Write hooks. Every write follows:
 *   quote (API) -> exact approve (simulated, receipt-checked) -> simulate main call
 *   -> write -> receipt.status check -> invalidate queries.
 * Approve runs before the main simulation because simulating a router call that
 * pulls tokens reverts until the allowance exists.
 *
 * Contract calls are stubbed in lib/contracts.ts (`contractCalls`) until ABIs land.
 * TODO(contracts): add Builder Code `dataSuffix` + CDP paymaster (gas sponsorship).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { toast } from "sonner";
import { keccak256, toBytes, type Address, type Hash } from "viem";
import { useApi } from "@/lib/api/use-api";
import { qk } from "@/lib/api/query-keys";
import { DEFAULT_CHAIN_ID, explorerTxUrl, type SupportedChainId } from "@/lib/chains";
import { contractCalls, getDeployment, isDeployed, NotWiredError, type CreateArgs } from "@/lib/contracts";
import { describeTxError, ensureExactAllowance, waitForSuccess, type TxStep } from "@/lib/tx";
import { minOutWithSlippage } from "@/lib/units";
import { useWallet } from "./use-wallet";

type Ready = { chainId: SupportedChainId; account: Address };

function useTxBase() {
  const config = useConfig();
  const qc = useQueryClient();
  const api = useApi();
  const wallet = useWallet();
  const [step, setStep] = useState<TxStep>("idle");

  function requireReady(): Ready {
    if (!wallet.address) throw new Error("Connect a wallet first.");
    if (wallet.wrongChain) throw new Error("Switch to the supported network first.");
    const chainId = DEFAULT_CHAIN_ID;
    if (!isDeployed(chainId)) throw new NotWiredError(`Alloy contracts on chain ${chainId}`);
    return { chainId, account: wallet.address };
  }

  async function finish(ready: Ready, hash: Hash, invalidate: readonly (readonly unknown[])[]) {
    setStep("confirm");
    await waitForSuccess(config, ready.chainId, hash);
    setStep("done");
    await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
    await qc.invalidateQueries({ queryKey: qk.onchain(ready.account, ready.chainId) });
    toast.success("Transaction confirmed", {
      action: { label: "View", onClick: () => window.open(explorerTxUrl(ready.chainId, hash), "_blank") },
    });
    return hash;
  }

  function onError(err: unknown) {
    setStep("error");
    toast.error(describeTxError(err));
  }

  return { config, api, step, setStep, requireReady, finish, onError, reset: () => setStep("idle") };
}

export function useBuyBasket(basket: Address) {
  const b = useTxBase();
  const mutation = useMutation({
    mutationFn: async ({ usdcIn, slippageBps }: { usdcIn: bigint; slippageBps: number }) => {
      const ready = b.requireReady();
      const ctx = { config: b.config, ...ready };
      b.setStep("quote");
      const quote = await b.api.quote(basket, "buy", usdcIn);
      const args = {
        basket,
        usdcIn,
        minOuts: quote.minOuts.map((m) => minOutWithSlippage(m, slippageBps)),
        minShares: minOutWithSlippage(quote.expectedOut, slippageBps),
      };
      const { router, usdc } = getDeployment(ready.chainId);
      b.setStep("approve");
      await ensureExactAllowance(b.config, { chainId: ready.chainId, token: usdc, owner: ready.account, spender: router, amount: usdcIn });
      b.setStep("simulate");
      const request = await contractCalls.simulateBuy(ctx, args);
      b.setStep("write");
      const hash = await contractCalls.writeBuy(ctx, request);
      return b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)]);
    },
    onError: b.onError,
  });
  return { ...mutation, step: b.step, resetStep: b.reset };
}

export function useSellBasket(basket: Address) {
  const b = useTxBase();
  const mutation = useMutation({
    mutationFn: async ({ shares, slippageBps }: { shares: bigint; slippageBps: number }) => {
      const ready = b.requireReady();
      const ctx = { config: b.config, ...ready };
      b.setStep("quote");
      const quote = await b.api.quote(basket, "sell", shares);
      const args = {
        basket,
        shares,
        minOuts: quote.minOuts.map((m) => minOutWithSlippage(m, slippageBps)),
        minUsdc: minOutWithSlippage(quote.expectedOut, slippageBps),
      };
      // TODO(contracts): confirm the router pulls basket shares (needs approval) vs. redeem-on-behalf.
      b.setStep("approve");
      await ensureExactAllowance(b.config, {
        chainId: ready.chainId,
        token: basket,
        owner: ready.account,
        spender: getDeployment(ready.chainId).router,
        amount: shares,
      });
      b.setStep("simulate");
      const request = await contractCalls.simulateSell(ctx, args);
      b.setStep("write");
      const hash = await contractCalls.writeSell(ctx, request);
      return b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)]);
    },
    onError: b.onError,
  });
  return { ...mutation, step: b.step, resetStep: b.reset };
}

/** In-kind withdraw: Basket.redeem(shares, to). No quote/approval; always available. */
export function useWithdraw(basket: Address) {
  const b = useTxBase();
  const mutation = useMutation({
    mutationFn: async ({ shares }: { shares: bigint }) => {
      const ready = b.requireReady();
      const ctx = { config: b.config, ...ready };
      b.setStep("simulate");
      const request = await contractCalls.simulateRedeem(ctx, { basket, shares, to: ready.account });
      b.setStep("write");
      const hash = await contractCalls.writeRedeem(ctx, request);
      return b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)]);
    },
    onError: b.onError,
  });
  return { ...mutation, step: b.step, resetStep: b.reset };
}

export function useCreateBasket() {
  const b = useTxBase();
  const mutation = useMutation({
    mutationFn: async (args: Omit<CreateArgs, "minOuts"> & { slippageBps: number }) => {
      const ready = b.requireReady();
      const ctx = { config: b.config, ...ready };
      // TODO(api): quote the seed swaps (POST /quote for a not-yet-created recipe) -> minOuts.
      b.setStep("quote");
      const minOuts = args.components.map(() => 0n);
      const { factory, usdc } = getDeployment(ready.chainId);
      b.setStep("approve");
      await ensureExactAllowance(b.config, { chainId: ready.chainId, token: usdc, owner: ready.account, spender: factory, amount: args.usdcSeed });
      b.setStep("simulate");
      const request = await contractCalls.simulateCreate(ctx, { ...args, minOuts });
      b.setStep("write");
      const hash = await contractCalls.writeCreate(ctx, request);
      // TODO(contracts): decode BasketCreated from the receipt to get the new address,
      // then POST /baskets/:a/meta (thesis) with the Privy JWT.
      return b.finish(ready, hash, [qk.baskets.all()]);
    },
    onError: b.onError,
  });
  return { ...mutation, step: b.step, resetStep: b.reset };
}

export function useProposeRecipe(basket: Address) {
  const b = useTxBase();
  const mutation = useMutation({
    mutationFn: async ({ weightsBps, reason }: { weightsBps: number[]; reason: string }) => {
      const ready = b.requireReady();
      const ctx = { config: b.config, ...ready };
      const reasonHash = keccak256(toBytes(reason));
      b.setStep("simulate");
      const request = await contractCalls.simulatePropose(ctx, { basket, weightsBps, reasonHash });
      b.setStep("write");
      const hash = await contractCalls.writePropose(ctx, request);
      // TODO(api): POST /baskets/:a/rebalance-reason { reason, reasonHash, txHash } with JWT.
      return b.finish(ready, hash, [qk.baskets.rebalances(basket)]);
    },
    onError: b.onError,
  });
  return { ...mutation, step: b.step, resetStep: b.reset };
}
