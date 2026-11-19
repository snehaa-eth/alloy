"use client";

/**
 * Write hooks. Every write follows:
 *   quote (on-chain QuoterV2, or API) -> balance check -> exact approve (simulated, receipt-checked)
 *   -> simulate main call (custom errors decoded to plain English) -> write (Builder Code dataSuffix)
 *   -> receipt.status check -> invalidate queries.
 *
 * Gas: when NEXT_PUBLIC_PRIVY_SPONSOR_GAS=1 and the active wallet is the Privy embedded wallet, txs go
 * through Privy's `sendTransaction(..., { sponsor: true })` (enable gas sponsorship for Base Sepolia in
 * the Privy dashboard). Otherwise the wagmi wallet sends and pays gas.
 *
 * Each hook returns the TanStack mutation plus: step, resetStep, txHash, approveHash, errorMessage, result.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { toast } from "sonner";
import { erc20Abi, type Address, type Hash, type TransactionReceipt } from "viem";
import { readContract } from "wagmi/actions";
import { useApi } from "@/lib/api/use-api";
import { qk } from "@/lib/api/query-keys";
import { DEFAULT_CHAIN_ID, explorerTxUrl, type SupportedChainId } from "@/lib/chains";
import { getDeployment, isDeployed, NotWiredError, reasonHashOf, txs, type CreateArgs } from "@/lib/contracts";
import { recordBuy, recordExit } from "@/lib/cost-basis";
import { quoteSeedOnchain, type BasketQuote } from "@/lib/quote";
import { getReadClient } from "@/lib/rpc";
import {
  describeTxError,
  ensureExactAllowance,
  sendTx,
  simulateTx,
  waitForSuccess,
  type Sender,
  type TxCtx,
  type TxStep,
} from "@/lib/tx";
import { formatUsd6 } from "@/lib/units";
import { useWallet } from "./use-wallet";

type Ready = { chainId: SupportedChainId; account: Address };

const SPONSOR = process.env.NEXT_PUBLIC_PRIVY_SPONSOR_GAS === "1";

/** Picks Privy-sponsored sending for the embedded wallet, wagmi otherwise. */
function usePrivySender(account: Address | undefined): Sender | undefined {
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  return useMemo(() => {
    if (!SPONSOR || !account) return undefined;
    const w = wallets.find((x) => x.address.toLowerCase() === account.toLowerCase());
    if (!w || w.walletClientType !== "privy") return undefined;
    const s: Sender = async ({ to, data, chainId }) => {
      const { hash } = await sendTransaction({ to, data, chainId }, { sponsor: true, address: account });
      return hash;
    };
    return s;
  }, [account, wallets, sendTransaction]);
}

function useTxBase<R>() {
  const config = useConfig();
  const qc = useQueryClient();
  const api = useApi();
  const wallet = useWallet();
  const sender = usePrivySender(wallet.address);
  const [step, setStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [approveHash, setApproveHash] = useState<Hash | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<R | null>(null);

  function requireReady(): Ready & { ctx: TxCtx } {
    if (!wallet.address) throw new Error("Connect a wallet first.");
    if (wallet.wrongChain) throw new Error("Switch to Base Sepolia first.");
    const chainId = DEFAULT_CHAIN_ID;
    if (!isDeployed(chainId)) throw new NotWiredError(`Alloy on chain ${chainId}`);
    return { chainId, account: wallet.address, ctx: { config, chainId, account: wallet.address, sender } };
  }

  async function approve(ready: Ready, token: Address, spender: Address, amount: bigint) {
    setStep("approve");
    const h = await ensureExactAllowance(config, { chainId: ready.chainId, token, owner: ready.account, spender, amount, sender });
    if (h) setApproveHash(h);
  }

  async function finish(
    ready: Ready,
    hash: Hash,
    invalidate: readonly (readonly unknown[])[],
    successMsg = "Transaction confirmed",
  ): Promise<TransactionReceipt> {
    setTxHash(hash);
    setStep("confirm");
    const receipt = await waitForSuccess(config, ready.chainId, hash);
    setStep("done");
    await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
    await qc.invalidateQueries({ queryKey: qk.onchain(ready.account, ready.chainId) });
    // wagmi's own read hooks (useReadContract / useBalance)
    await qc.invalidateQueries({ queryKey: ["readContract"] });
    await qc.invalidateQueries({ queryKey: ["balance"] });
    toast.success(successMsg, {
      action: { label: "View", onClick: () => window.open(explorerTxUrl(ready.chainId, hash), "_blank") },
    });
    return receipt;
  }

  const reset = useCallback(() => {
    setStep("idle");
    setTxHash(null);
    setApproveHash(null);
    setErrorMessage(null);
    setResult(null);
  }, []);

  function begin() {
    setTxHash(null);
    setApproveHash(null);
    setErrorMessage(null);
    setResult(null);
  }

  function onError(err: unknown) {
    const msg = describeTxError(err);
    setStep("error");
    setErrorMessage(msg);
    toast.error(msg);
  }

  return {
    config, api, step, setStep, requireReady, approve, finish, onError, begin, reset,
    txHash, approveHash, errorMessage, result, setResult,
  };
}

function expose<R, M extends object>(b: ReturnType<typeof useTxBase<R>>, mutation: M) {
  return {
    ...mutation,
    step: b.step,
    resetStep: b.reset,
    txHash: b.txHash,
    approveHash: b.approveHash,
    errorMessage: b.errorMessage,
    result: b.result,
  };
}

async function balanceOf(config: ReturnType<typeof useConfig>, chainId: SupportedChainId, token: Address, owner: Address) {
  return readContract(config, { chainId, address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
}

// ---------------------------------------------------------------------------
// Buy / Sell / Withdraw / Claim
// ---------------------------------------------------------------------------

export type BuyResult = { shares: bigint; quote: BasketQuote };

export function useBuyBasket(basket: Address) {
  const b = useTxBase<BuyResult>();
  const mutation = useMutation({
    mutationFn: async ({ usdcIn, slippageBps }: { usdcIn: bigint; slippageBps: number }) => {
      b.begin();
      const ready = b.requireReady();
      const { router, usdc, usdcSymbol } = getDeployment(ready.chainId);
      b.setStep("quote");
      const [quote, bal] = await Promise.all([
        b.api.quote(basket, "buy", usdcIn, slippageBps),
        balanceOf(b.config, ready.chainId, usdc, ready.account),
      ]);
      if (bal < usdcIn) throw new Error(`Not enough ${usdcSymbol}: you have ${formatUsd6(bal)}. Use the faucet to get test USDC.`);
      if (quote.expectedOut === 0n) throw new Error("This amount is too small to buy a share.");
      await b.approve(ready, usdc, router, usdcIn);
      b.setStep("simulate");
      const tx = txs.buy(ready.chainId, { basket, usdcIn, minOuts: quote.legs.map((l) => l.minOut), minShares: quote.minResult });
      const shares = await simulateTx<bigint>(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)], "Bought");
      recordBuy(ready.chainId, ready.account, basket, usdcIn, quote.refundUsd6);
      const r = { shares, quote };
      b.setResult(r);
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

export type SellResult = { usdcOut: bigint; quote: BasketQuote };

export function useSellBasket(basket: Address) {
  const b = useTxBase<SellResult>();
  const mutation = useMutation({
    mutationFn: async ({ shares, slippageBps }: { shares: bigint; slippageBps: number }) => {
      b.begin();
      const ready = b.requireReady();
      const { router } = getDeployment(ready.chainId);
      b.setStep("quote");
      const [quote, bal] = await Promise.all([
        b.api.quote(basket, "sell", shares, slippageBps),
        balanceOf(b.config, ready.chainId, basket, ready.account),
      ]);
      if (bal < shares) throw new Error("You don't hold that many shares.");
      // The router pulls basket shares with transferFrom -> exact approval.
      await b.approve(ready, basket, router, shares);
      b.setStep("simulate");
      const tx = txs.sell(ready.chainId, { basket, shares, minOuts: quote.legs.map((l) => l.minOut), minUsdc: quote.minResult });
      const usdcOut = await simulateTx<bigint>(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)], "Sold");
      recordExit(ready.chainId, ready.account, basket, shares, bal);
      b.setResult({ usdcOut, quote });
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

export type WithdrawResult = { amounts: readonly bigint[]; owedMask: bigint };

/** In-kind withdraw: Basket.redeem(shares, to). No quote/approval; never pausable. */
export function useWithdraw(basket: Address) {
  const b = useTxBase<WithdrawResult>();
  const mutation = useMutation({
    mutationFn: async ({ shares }: { shares: bigint }) => {
      b.begin();
      const ready = b.requireReady();
      const bal = await balanceOf(b.config, ready.chainId, basket, ready.account);
      if (bal < shares) throw new Error("You don't hold that many shares.");
      b.setStep("simulate");
      const tx = txs.redeem(ready.chainId, { basket, shares, to: ready.account });
      const [amounts, owedMask] = await simulateTx<readonly [readonly bigint[], bigint]>(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.detail(basket), qk.portfolio(ready.account, ready.chainId)], "Withdrawn to your wallet");
      recordExit(ready.chainId, ready.account, basket, shares, bal);
      if (owedMask !== 0n) toast.info("Some stocks couldn't be delivered yet. Claim them later from your portfolio.");
      b.setResult({ amounts, owedMask });
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

/** Basket.claimOwed(token, to): collect a stock that an earlier withdraw couldn't deliver. */
export function useClaimOwed(basket: Address) {
  const b = useTxBase<{ amount: bigint }>();
  const mutation = useMutation({
    mutationFn: async ({ token, to }: { token: Address; to?: Address }) => {
      b.begin();
      const ready = b.requireReady();
      b.setStep("simulate");
      const tx = txs.claimOwed(ready.chainId, { basket, token, to: to ?? ready.account });
      const amount = await simulateTx<bigint>(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.portfolio(ready.account, ready.chainId)], "Claimed");
      b.setResult({ amount });
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

// ---------------------------------------------------------------------------
// Creator
// ---------------------------------------------------------------------------

export type CreateResult = { basket: Address };

export function useCreateBasket() {
  const b = useTxBase<CreateResult>();
  const mutation = useMutation({
    mutationFn: async (
      args: Omit<CreateArgs, "minOuts"> & { slippageBps: number; thesis?: string; tags?: string[] },
    ) => {
      b.begin();
      const ready = b.requireReady();
      const { factory, usdc, usdcSymbol } = getDeployment(ready.chainId);
      b.setStep("quote");
      const [{ minOuts }, bal] = await Promise.all([
        quoteSeedOnchain(getReadClient(ready.chainId), ready.chainId, args.components, args.targetBps, args.usdcSeed, args.slippageBps),
        balanceOf(b.config, ready.chainId, usdc, ready.account),
      ]);
      if (bal < args.usdcSeed) throw new Error(`Not enough ${usdcSymbol} for the seed: you have ${formatUsd6(bal)}.`);
      await b.approve(ready, usdc, factory, args.usdcSeed);
      b.setStep("simulate");
      const { thesis, tags, slippageBps: _s, ...rest } = args;
      const tx = txs.create(ready.chainId, { ...rest, salt: rest.salt, minOuts });
      // One tx object (one salt) for simulate + send, so `created` is the deployed address.
      const created = await simulateTx<Address>(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.all()], "Basket created");
      b.setResult({ basket: created });
      if (thesis || tags?.length) {
        b.api.postMeta(created, { thesis: thesis || undefined, tags }).catch(() => undefined);
      }
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

export function useProposeRecipe(basket: Address) {
  const b = useTxBase<{ reasonHash: `0x${string}` }>();
  const mutation = useMutation({
    mutationFn: async ({ weightsBps, reason }: { weightsBps: number[]; reason: string }) => {
      b.begin();
      const ready = b.requireReady();
      const reasonHash = reasonHashOf(reason);
      b.setStep("simulate");
      const tx = txs.propose(ready.chainId, { basket, weightsBps, reasonHash });
      await simulateTx(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.detail(basket), qk.baskets.rebalances(basket)], "Recipe change proposed");
      // Store the reason text off-chain (hash-anchored). Best-effort.
      b.api.postReason(basket, reason).catch(() => undefined);
      b.setResult({ reasonHash });
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

export function useCancelRecipe(basket: Address) {
  const b = useTxBase<true>();
  const mutation = useMutation({
    mutationFn: async () => {
      b.begin();
      const ready = b.requireReady();
      b.setStep("simulate");
      const tx = txs.cancelRecipe(ready.chainId, basket);
      await simulateTx(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [qk.baskets.detail(basket), qk.baskets.rebalances(basket)], "Recipe change cancelled");
      b.setResult(true);
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}

// ---------------------------------------------------------------------------
// Faucet
// ---------------------------------------------------------------------------

/**
 * 1,000 tUSDC / day / address. Tries the API relayer first (Faucet.dripTo, relayer pays gas, works for
 * a fresh wallet with 0 ETH); falls back to Faucet.drip() from the user's wallet.
 */
export function useFaucet() {
  const b = useTxBase<{ relayed: boolean }>();
  const mutation = useMutation({
    mutationFn: async () => {
      b.begin();
      const ready = b.requireReady();
      b.setStep("quote");
      const relayed = await b.api.faucetRelay(ready.account);
      if (relayed) {
        await b.finish(ready, relayed, [], "Test USDC received");
        b.setResult({ relayed: true });
        return relayed;
      }
      b.setStep("simulate");
      const tx = txs.faucetDrip(ready.chainId);
      await simulateTx(ready.ctx, tx);
      b.setStep("write");
      const hash = await sendTx(ready.ctx, tx);
      await b.finish(ready, hash, [], "Test USDC received");
      b.setResult({ relayed: false });
      return hash;
    },
    onError: b.onError,
  });
  return expose(b, mutation);
}
