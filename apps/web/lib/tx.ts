/**
 * Transaction helpers shared by every write:
 *   quote -> simulate -> exact approve (or permit) -> write -> receipt.status check -> invalidate
 */
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  erc20Abi,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { readContract, simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import type { Config } from "wagmi";
import type { SupportedChainId } from "./chains";
import { NotWiredError } from "./contracts";

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

/**
 * Ensure `spender` may pull exactly `amount` of `token`. Approves the exact amount
 * (never infinite). Simulated before sending; receipt checked.
 * TODO(permit): use USDC EIP-2612 permit when the router exposes a permit entrypoint.
 */
export async function ensureExactAllowance(
  config: Config,
  args: { chainId: SupportedChainId; token: Address; owner: Address; spender: Address; amount: bigint },
): Promise<Hash | null> {
  const current = await readContract(config, {
    chainId: args.chainId,
    address: args.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [args.owner, args.spender],
  });
  if (current >= args.amount) return null;
  const { request } = await simulateContract(config, {
    chainId: args.chainId,
    account: args.owner,
    address: args.token,
    abi: erc20Abi,
    functionName: "approve",
    args: [args.spender, args.amount],
  });
  const hash = await writeContract(config, request);
  await waitForSuccess(config, args.chainId, hash);
  return hash;
}

/** Known custom errors -> user-facing copy. Names must match the contracts' errors. */
const REVERT_COPY: Record<string, string> = {
  PolicyForbids: "A stock token's transfer policy blocked this transfer. Try withdrawing in-kind or contact support.",
  StaleFeed: "Price feeds are stale (market may be closed). Try again during US market hours.",
  FeedPaused: "A price feed is paused (possible corporate action). Try again later.",
  SlippageExceeded: "Price moved more than your slippage limit. Get a new quote and retry.",
  InsufficientOutput: "Price moved more than your slippage limit. Get a new quote and retry.",
  TvlCapExceeded: "This basket has reached its deposit cap.",
  Paused: "Deposits are paused. You can still sell or withdraw.",
};

export function describeTxError(err: unknown): string {
  if (err instanceof NotWiredError) return err.message;
  if (err instanceof TxRevertedError) return err.message;
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "You rejected the request in your wallet.";
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && REVERT_COPY[name]) return REVERT_COPY[name];
      return revert.reason ?? `Transaction would revert${name ? ` (${name})` : ""}.`;
    }
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
