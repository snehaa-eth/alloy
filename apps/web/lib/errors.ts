/**
 * Turn any revert / wallet / RPC error into a plain-English message.
 * Pure (no wagmi), so it is unit-tested in errors.test.ts.
 */
import {
  BaseError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  UserRejectedRequestError,
  decodeErrorResult,
  type Hex,
} from "viem";
import { allErrorsAbi } from "./abis";
import { formatUsd6 } from "./units";

export type DecodedError = { name: string; args: readonly unknown[] };

const ts = (v: unknown) => {
  const n = typeof v === "bigint" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toUTCString().replace(/:\d\d GMT$/, " UTC") : "";
};

/** Custom-error name -> user-facing copy. Args are the decoded error args. */
const COPY: Record<string, (args: readonly unknown[]) => string> = {
  // Price feeds / guard
  StaleFeed: () => "Stock prices are stale (US market may be closed or the price feed is lagging). Try again later.",
  FeedPaused: () => "A stock's price feed is paused (possible corporate action). Try again later.",
  BadAnswer: () => "A price feed returned an invalid price. Try again later.",
  MultiplierChangePending: () => "A stock split or dividend adjustment is pending. Trading resumes after it settles.",
  MultiplierStateUnknown: () => "A stock's split/dividend state could not be checked. Try again later.",
  // Slippage
  InsufficientOutput: () => "Price moved more than your slippage limit. Get a new quote and retry.",
  InsufficientShares: () => "Price moved more than your slippage limit. Get a new quote and retry.",
  InsufficientUsdc: () => "Price moved more than your slippage limit. Get a new quote and retry.",
  SlippageExceeded: () => "Price moved more than your slippage limit. Get a new quote and retry.",
  // Transfer policy (B20)
  PolicyForbids: () =>
    "A stock token's transfer policy blocked this transfer. Use in-kind Withdraw instead, or contact support.",
  ContractPaused: () => "A stock token is paused by its issuer. You can still withdraw in-kind.",
  // Router / basket
  RedeemIncomplete: () =>
    "One of the stocks can't be delivered right now, so selling for USDC is blocked. Use Withdraw (in-kind) instead.",
  TvlCapExceeded: (a) =>
    `This basket has reached its deposit cap${typeof a[1] === "bigint" ? ` (${formatUsd6((a[1] as bigint) / 100n)})` : ""}.`,
  ProtocolPaused: () => "Deposits are paused. You can still sell or withdraw.",
  Paused: () => "Deposits are paused. You can still sell or withdraw.",
  UnknownBasket: () => "This is not an Alloy basket.",
  ZeroAmount: () => "Enter an amount greater than zero.",
  ZeroNav: () => "This basket has no value yet.",
  BasketEmpty: () => "This basket is empty (everyone has withdrawn), so it can't take new deposits.",
  LengthMismatch: () => "The basket changed while you were quoting. Refresh and try again.",
  SupplyChanged: () => "The basket changed while you were quoting. Refresh and try again.",
  // Creator actions
  NotCreator: () => "Only the basket's creator can do this.",
  NotKeeper: () => "Only the Alloy keeper can execute rebalances.",
  PendingRecipeExists: () => "There is already a pending recipe change. Cancel it first.",
  NoPendingRecipe: () => "There is no pending recipe change to cancel.",
  InvalidWeights: () => "Weights must be whole bps, each above 0 and at most the cap, adding up to 100%.",
  InvalidParams: () => "Some basket settings are invalid (name, symbol, weights, bands or fee).",
  NotAllowed: () => "One of the selected stocks is not on Alloy's allow-list.",
  DuplicateComponent: () => "The same stock appears twice.",
  SeedTooSmall: () => "The seed must be at least $10.",
  RebalanceCooldown: (a) => `Rebalances are limited to one a day. Next slot: ${ts(a[0])}.`,
  LossTooHigh: () => "This rebalance would lose too much value to slippage, so it was blocked.",
  WeeklyBudgetExceeded: () => "This week's rebalance cost budget is used up.",
  BandViolation: () => "The rebalance would leave a stock outside its allowed band.",
  NothingOwed: () => "Nothing is owed to you for this stock.",
  // Tokens
  InsufficientBalance: (a) =>
    a.length === 3 && typeof a[2] === "bigint" ? "Not enough balance for this amount." : "Not enough balance.",
  InsufficientAllowance: () => "The approval is too small. Approve again and retry.",
  // Faucet
  CoolingDown: (a) => `You already claimed test USDC today. Next claim: ${ts(a[0])}.`,
  DailyCapReached: () => "The faucet hit today's global limit. Try again tomorrow.",
};

/** Decode raw revert data against every Alloy/B20/guard error. */
export function decodeRevertData(data: Hex | undefined): DecodedError | null {
  if (!data || data === "0x" || data.length < 10) return null;
  try {
    const r = decodeErrorResult({ abi: allErrorsAbi, data });
    return { name: r.errorName, args: (r.args ?? []) as readonly unknown[] };
  } catch {
    return null;
  }
}

/** Find the custom error inside any viem error chain (simulate, estimateGas, write). */
export function decodeTxError(err: unknown): DecodedError | null {
  if (!(err instanceof BaseError)) return null;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (revert instanceof ContractFunctionRevertedError) {
    if (revert.data?.errorName && revert.data.errorName !== "Error" && revert.data.errorName !== "Panic") {
      return { name: revert.data.errorName, args: (revert.data.args ?? []) as readonly unknown[] };
    }
    const fromRaw = decodeRevertData(revert.raw);
    if (fromRaw) return fromRaw;
    if (revert.data?.errorName === "Error") return { name: "Error", args: revert.data.args ?? [] };
  }
  // Raw data nested elsewhere (e.g. RPC error with `data`)
  let raw: Hex | undefined;
  err.walk((e) => {
    const d = (e as { data?: unknown }).data;
    if (typeof d === "string" && d.startsWith("0x")) raw = d as Hex;
    return false;
  });
  return decodeRevertData(raw);
}

export function messageForError(e: DecodedError): string {
  const f = COPY[e.name];
  if (f) return f(e.args);
  if (e.name === "Error") {
    const reason = String(e.args[0] ?? "");
    if (/too little received|slippage/i.test(reason)) return COPY.InsufficientOutput([]);
    if (/STF|transfer/i.test(reason)) return "A token transfer failed. Check your balance and approval.";
    return reason || "Transaction would revert.";
  }
  return `Transaction would revert (${e.name}).`;
}

export function describeTxErrorCore(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "You rejected the request in your wallet.";
    if (err.walk((e) => e instanceof InsufficientFundsError))
      return "Your wallet has no Base Sepolia ETH for gas. Get some from a Base Sepolia faucet and retry.";
    const decoded = decodeTxError(err);
    if (decoded) return messageForError(decoded);
    if (/user rejected|denied/i.test(err.details ?? "")) return "You rejected the request in your wallet.";
    return err.shortMessage;
  }
  if (err instanceof Error) {
    if (/user rejected|denied transaction|rejected the request/i.test(err.message))
      return "You rejected the request in your wallet.";
    if (/insufficient funds/i.test(err.message))
      return "Your wallet has no Base Sepolia ETH for gas. Get some from a Base Sepolia faucet and retry.";
    return err.message;
  }
  return "Something went wrong.";
}
