/**
 * Transaction helpers shared by every write:
 *   quote -> exact approve (simulated, receipt-checked) -> simulate main call -> write
 *   -> receipt.status check -> invalidate queries
 *
 * Approve runs before the main simulation because simulating a router call that pulls tokens
 * reverts until the allowance exists. tUSDC is a B20 token that does expose EIP-2612
 * (`DOMAIN_SEPARATOR`/`nonces`), but AlloyRouter has no permit entrypoint, so a permit would still
 * need its own transaction: exact approve is used.
 *
 * Every tx carries the Builder Code `dataSuffix` (lib/contracts.ts) and is sent through a `Sender`,
 * which is either the wagmi wallet or Privy's sponsored `sendTransaction` (gasless embedded wallet).
 */
import { erc20Abi, type Address, type Hash, type Hex, type TransactionReceipt } from "viem";
import { readContract, sendTransaction, simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import type { Config } from "wagmi";
import type { SupportedChainId } from "./chains";
import { BUILDER_DATA_SUFFIX, NotWiredError, encodeTx, type ContractTx } from "./contracts";
import { describeTxErrorCore } from "./errors";

export type TxStep = "idle" | "quote" | "approve" | "simulate" | "write" | "confirm" | "done" | "error";

export const TX_STEP_LABEL: Record<TxStep, string> = {
  idle: "",
  quote: "Getting a quote…",
  approve: "Approving exact amount…",
  simulate: "Simulating…",
  write: "Confirm in your wallet…",
  confirm: "Waiting for confirmation…",
  done: "Done",
  error: "Failed",
};

export class TxRevertedError extends Error {
  constructor(readonly hash: Hash) {
    super(`Transaction ${hash} reverted on-chain.`);
    this.name = "TxRevertedError";
  }
}

/** Sends a raw tx (calldata already includes the Builder Code suffix). Returns the hash. */
export type Sender = (tx: { to: Address; data: Hex; chainId: SupportedChainId; account: Address }) => Promise<Hash>;

/** Default sender: the connected wagmi wallet (Privy embedded or external). */
export function wagmiSender(config: Config): Sender {
  return ({ to, data, chainId, account }) => sendTransaction(config, { to, data, chainId, account });
}

/** Wait for the receipt and fail loudly unless status === "success". */
export async function waitForSuccess(
  config: Config,
  chainId: SupportedChainId,
  hash: Hash,
): Promise<TransactionReceipt> {
  const receipt = await waitForTransactionReceipt(config, { hash, chainId });
  if (receipt.status !== "success") throw new TxRevertedError(hash);
  return receipt;
}

export type TxCtx = { config: Config; chainId: SupportedChainId; account: Address; sender?: Sender };

/** eth_call the tx from the user (decodes custom errors on revert); returns the function's return value. */
export async function simulateTx<R = unknown>(ctx: TxCtx, tx: ContractTx): Promise<R> {
  const { result } = await simulateContract(ctx.config, {
    ...(tx as never as Parameters<typeof simulateContract>[1]),
    chainId: ctx.chainId,
    account: ctx.account,
    dataSuffix: BUILDER_DATA_SUFFIX,
  });
  return result as R;
}

/** Send an already-simulated tx with the Builder Code suffix. */
export async function sendTx(ctx: TxCtx, tx: ContractTx): Promise<Hash> {
  const sender = ctx.sender ?? wagmiSender(ctx.config);
  return sender({ to: tx.address, data: encodeTx(tx), chainId: ctx.chainId, account: ctx.account });
}

/**
 * Ensure `spender` may pull exactly `amount` of `token`. Approves the exact amount
 * (never infinite). Simulated before sending; receipt checked. Returns the approve hash or null.
 */
export async function ensureExactAllowance(
  config: Config,
  args: { chainId: SupportedChainId; token: Address; owner: Address; spender: Address; amount: bigint; sender?: Sender },
): Promise<Hash | null> {
  const current = await readContract(config, {
    chainId: args.chainId,
    address: args.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [args.owner, args.spender],
  });
  if (current >= args.amount) return null;
  const ctx: TxCtx = { config, chainId: args.chainId, account: args.owner, sender: args.sender };
  const tx: ContractTx = { address: args.token, abi: erc20Abi, functionName: "approve", args: [args.spender, args.amount] };
  await simulateTx(ctx, tx);
  const hash = await sendTx(ctx, tx);
  await waitForSuccess(config, args.chainId, hash);
  return hash;
}

/** Plain-English message for any error thrown in a write flow. */
export function describeTxError(err: unknown): string {
  if (err instanceof NotWiredError) return err.message;
  if (err instanceof TxRevertedError) return err.message;
  return describeTxErrorCore(err);
}
