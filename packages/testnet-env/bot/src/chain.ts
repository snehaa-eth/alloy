import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  maxUint256,
  toHex,
  type Account,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { b20Abi, feedAbi, poolAbi, quoterV2Abi, registryAbi, swapRouter02Abi } from "./abis.js";
import type { BotConfig } from "./config.js";
import type { Deployments, StockDeployment } from "./deployments.js";
import {
  answerFromSqrtPriceX96,
  deviationBps,
  fmtUsd,
  planSwapToTarget,
  sqrtPriceX96FromAnswer,
} from "./math.js";

export const MINT_ROLE = keccak256(toHex("MINT_ROLE"));

export interface Ctx {
  cfg: BotConfig;
  d: Deployments;
  pub: PublicClient;
  wallet?: WalletClient;
  /** Address that signs (or, in dry-run, is simulated as the sender). */
  sender: Address;
  account?: Account | Address;
  log: (msg: string) => void;
}

export async function makeCtx(cfg: BotConfig, d: Deployments): Promise<Ctx> {
  const transport = http(cfg.rpcUrl);
  const chainId = d.chainId;
  const chain = defineChain({
    id: chainId,
    name: chainId === 84532 ? "Base Sepolia" : `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
  });
  const pub = createPublicClient({ chain, transport }) as PublicClient;
  const rpcChainId = await pub.getChainId();
  if (rpcChainId !== chainId) {
    throw new Error(`RPC chainId ${rpcChainId} != deployments chainId ${chainId} (${cfg.deploymentsPath})`);
  }

  let account: Account | Address | undefined;
  if (cfg.privateKey) account = privateKeyToAccount(cfg.privateKey);
  else if (cfg.unlockedAddress) account = cfg.unlockedAddress; // eth_sendTransaction on an unlocked node
  const sender = account ? (typeof account === "string" ? account : account.address) : d.bot;

  const wallet = account ? createWalletClient({ chain, transport, account }) : undefined;
  const log = (m: string) => console.log(`[${new Date().toISOString()}]${cfg.dryRun ? " [dry-run]" : ""} ${m}`);
  return { cfg, d, pub, wallet, sender, account, log };
}

/** Simulate, then (unless dry-run) send and wait. Returns the tx hash or undefined in dry-run. */
async function exec(
  ctx: Ctx,
  req: { address: Address; abi: readonly unknown[]; functionName: string; args: readonly unknown[] },
  label: string,
): Promise<Hash | undefined> {
  const { request } = await ctx.pub.simulateContract({
    ...(req as Parameters<PublicClient["simulateContract"]>[0]),
    account: ctx.account ?? ctx.sender,
  });
  if (ctx.cfg.dryRun) {
    ctx.log(`would send ${label} (simulation OK)`);
    return undefined;
  }
  if (!ctx.wallet) {
    throw new Error("no signer: set BOT_PK (or DEPLOYER_PK), or BOT_ADDRESS for an unlocked local node, or pass --dry-run");
  }
  const hash = await ctx.wallet.writeContract(request as Parameters<WalletClient["writeContract"]>[0]);
  const rcpt = await ctx.pub.waitForTransactionReceipt({ hash });
  if (rcpt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  ctx.log(`${label} -> ${hash}`);
  return hash;
}

/*//////////////////////////////////////////////////////////////
                              READS
//////////////////////////////////////////////////////////////*/

export interface FeedState {
  roundId: bigint;
  answer: bigint;
  updatedAt: bigint;
  paused: boolean;
}

export async function readFeed(ctx: Ctx, s: StockDeployment): Promise<FeedState> {
  const [round, paused] = await Promise.all([
    ctx.pub.readContract({ address: s.feed, abi: feedAbi, functionName: "latestRoundData" }),
    ctx.pub.readContract({ address: s.feed, abi: feedAbi, functionName: "paused" }),
  ]);
  return { roundId: round[0], answer: round[1], updatedAt: round[3], paused };
}

export interface PoolState {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  answer: bigint;
}

export async function readPool(ctx: Ctx, s: StockDeployment): Promise<PoolState> {
  const [slot0, liquidity] = await Promise.all([
    ctx.pub.readContract({ address: s.pool, abi: poolAbi, functionName: "slot0" }),
    ctx.pub.readContract({ address: s.pool, abi: poolAbi, functionName: "liquidity" }),
  ]);
  return {
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
    liquidity,
    answer: answerFromSqrtPriceX96(slot0[0], s.stockIsToken0),
  };
}

/*//////////////////////////////////////////////////////////////
                              FEEDS
//////////////////////////////////////////////////////////////*/

export async function pushPrice(ctx: Ctx, s: StockDeployment, answer: bigint, reason: string) {
  const f = await readFeed(ctx, s);
  if (f.paused) {
    ctx.log(`${s.symbol}: feed PAUSED, not pushing ${fmtUsd(answer)} (${reason})`);
    return false;
  }
  await exec(
    ctx,
    { address: s.feed, abi: feedAbi, functionName: "updateAnswer", args: [answer] },
    `${s.symbol} feed ${fmtUsd(f.answer)} -> ${fmtUsd(answer)} (${reason})`,
  );
  return true;
}

export async function backdate(ctx: Ctx, s: StockDeployment, answer: bigint, updatedAt: bigint) {
  await exec(
    ctx,
    { address: s.feed, abi: feedAbi, functionName: "updateAnswerAt", args: [answer, updatedAt] },
    `${s.symbol} feed round backdated to ${new Date(Number(updatedAt) * 1000).toISOString()} (STALE)`,
  );
}

export async function setPaused(ctx: Ctx, s: StockDeployment, paused: boolean) {
  await exec(
    ctx,
    { address: ctx.d.feedPauseRegistry, abi: registryAbi, functionName: "setOraclePaused", args: [s.feed, paused] },
    `${s.symbol} feed ${paused ? "PAUSED" : "unpaused"} via registry`,
  );
}

/*//////////////////////////////////////////////////////////////
                            ARBITRAGE
//////////////////////////////////////////////////////////////*/

async function ensureBalanceAndAllowance(ctx: Ctx, token: Address, amount: bigint, label: string) {
  const router = ctx.d.uniswap.swapRouter02;
  const [bal, allowance] = await Promise.all([
    ctx.pub.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [ctx.sender] }),
    ctx.pub.readContract({ address: token, abi: b20Abi, functionName: "allowance", args: [ctx.sender, router] }),
  ]);
  if (bal < amount) {
    await exec(
      ctx,
      { address: token, abi: b20Abi, functionName: "mint", args: [ctx.sender, amount - bal] },
      `mint ${amount - bal} ${label} to bot`,
    );
  }
  if (allowance < amount) {
    await exec(
      ctx,
      { address: token, abi: b20Abi, functionName: "approve", args: [router, maxUint256] },
      `approve ${label} for SwapRouter02`,
    );
  }
}

/**
 * Swap the pool back to the feed price (|pool - feed| <= tolerance). Uses freshly minted test tokens.
 * Computes the exact input from in-range liquidity, sends exactInputSingle with sqrtPriceLimitX96 = target
 * (so it can never overshoot), and iterates in case an initialized tick was crossed.
 */
export async function arbPool(ctx: Ctx, s: StockDeployment, targetAnswer?: bigint): Promise<void> {
  const target = targetAnswer ?? (await readFeed(ctx, s)).answer;
  const sqrtTarget = sqrtPriceX96FromAnswer(target, s.stockIsToken0);
  const usdc = ctx.d.usdc.token;
  const [token0, token1] = s.stockIsToken0 ? [s.token, usdc] : [usdc, s.token];
  const fee = ctx.d.uniswap.feeTier;

  for (let iter = 0; iter < 4; iter++) {
    const p = await readPool(ctx, s);
    const dev = deviationBps(p.answer, target);
    if (dev <= ctx.cfg.arbToleranceBps) {
      ctx.log(`${s.symbol}: pool ${fmtUsd(p.answer)} vs feed ${fmtUsd(target)} (${dev} bps) within tolerance`);
      return;
    }
    let plan = planSwapToTarget(p.sqrtPriceX96, sqrtTarget, p.liquidity, fee);
    if (!plan) return;
    if (p.liquidity === 0n) {
      // Price sits outside every position: push through the empty region; the price limit bounds it.
      plan = { ...plan, amountIn: plan.zeroForOne === s.stockIsToken0 ? 1_000n * 10n ** 8n : 1_000_000n * 10n ** 6n };
    }
    const tokenIn = plan.zeroForOne ? token0 : token1;
    const tokenOut = plan.zeroForOne ? token1 : token0;
    const inLabel = tokenIn === usdc ? "tUSDC" : s.symbol;
    ctx.log(
      `${s.symbol}: pool ${fmtUsd(p.answer)} vs feed ${fmtUsd(target)} (${dev} bps) -> swap ${plan.amountIn} raw ${inLabel} in`,
    );

    if (ctx.cfg.dryRun) {
      // QuoterV2 needs no balances/allowances: verify the swap lands on target.
      const { result } = await ctx.pub.simulateContract({
        address: ctx.d.uniswap.quoterV2,
        abi: quoterV2Abi,
        functionName: "quoteExactInputSingle",
        args: [{ tokenIn, tokenOut, amountIn: plan.amountIn, fee, sqrtPriceLimitX96: plan.sqrtPriceLimitX96 }],
      });
      const after = answerFromSqrtPriceX96(result[1], s.stockIsToken0);
      ctx.log(
        `${s.symbol}: quote -> pool would be ${fmtUsd(after)} (${deviationBps(after, target)} bps from feed), out ${result[0]}`,
      );
      return;
    }

    await ensureBalanceAndAllowance(ctx, tokenIn, plan.amountIn, inLabel);
    await exec(
      ctx,
      {
        address: ctx.d.uniswap.swapRouter02,
        abi: swapRouter02Abi,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn,
            tokenOut,
            fee,
            recipient: ctx.sender,
            amountIn: plan.amountIn,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: plan.sqrtPriceLimitX96,
          },
        ],
      },
      `${s.symbol} arb swap`,
    );
  }
  const p = await readPool(ctx, s);
  ctx.log(`${s.symbol}: after arb pool ${fmtUsd(p.answer)} (${deviationBps(p.answer, target)} bps from feed)`);
}

/*//////////////////////////////////////////////////////////////
                              STATUS
//////////////////////////////////////////////////////////////*/

export async function status(ctx: Ctx) {
  const block = await ctx.pub.getBlock();
  const rows = [];
  for (const s of Object.values(ctx.d.stocks)) {
    const [f, p, mult, pendingAt, mintOk] = await Promise.all([
      readFeed(ctx, s),
      readPool(ctx, s),
      // Cobalt (ERC-8056) surface first; pre-Cobalt nodes (Base Foundry v1.1.0 forks) only have multiplier().
      ctx.pub
        .readContract({ address: s.token, abi: b20Abi, functionName: "uiMultiplier" })
        .catch(() => ctx.pub.readContract({ address: s.token, abi: b20Abi, functionName: "multiplier" })),
      ctx.pub.readContract({ address: s.token, abi: b20Abi, functionName: "effectiveAt" }).catch(() => 0n),
      ctx.pub.readContract({ address: s.token, abi: b20Abi, functionName: "hasRole", args: [MINT_ROLE, ctx.sender] }),
    ]);
    rows.push({
      stock: s.symbol,
      feed: fmtUsd(f.answer),
      pool: fmtUsd(p.answer),
      devBps: deviationBps(p.answer, f.answer),
      round: Number(f.roundId),
      ageMin: Number((block.timestamp - f.updatedAt) / 60n),
      paused: f.paused,
      uiMult: Number(mult) / 1e18,
      pendingSplit: pendingAt > block.timestamp ? new Date(Number(pendingAt) * 1000).toISOString() : "-",
      botCanMint: mintOk,
    });
  }
  console.table(rows);
}
