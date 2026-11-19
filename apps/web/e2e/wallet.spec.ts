/**
 * Part B: real wallet flow on Base Sepolia (84532) with an injected EIP-1193 test wallet (seeded follower key from
 * packages/testnet-env/.env.seed via e2e/run.mjs → process.env.E2E_PK; never printed).
 *
 * 1. Try the real Privy login: Sign in → Continue with a wallet → "Alloy E2E Wallet" → SIWE.
 * 2a. If that works: real UI buy $10 + sell 25% on The AI Build-Out.
 * 2b. If Privy refuses: buy/sell UI journey on /dev-trade (mocked tx), then the same buy/sell on-chain with viem
 *     (quote API → exact approve → simulate → AlloyRouter.buy/sell → receipt), faucet relay first if tUSDC < $15.
 */
import { expect, test, type Page } from "@playwright/test";
import { createWalletClient, erc20Abi, formatUnits, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { alloyRouterAbi } from "../../../packages/sdk/src/generated";
import { AI_BUILD_OUT, balances, pub, ROUTER, RPC, USDC } from "./chain";
import { caption, check, keyShot, OUT, record, watchErrors } from "./helpers";
import { hasKey, installWallet } from "./wallet";
import { appendFileSync } from "node:fs";

const API = process.env.E2E_API || "http://localhost:4000/api/v1";
const TOTAL = 12;
let k = 0;
const step = (page: Page, s: string) => caption(page, `Step ${++k}/${TOTAL}: ${s}`);
const facts = (o: Record<string, unknown>) => appendFileSync(`${OUT}/wallet-facts.jsonl`, JSON.stringify({ at: new Date().toISOString(), ...o }) + "\n");

test.skip(!hasKey(), "no E2E_PK (run via node e2e/run.mjs)");

test("wallet flow: sign in, buy $10, sell 25%", async ({ page }, info) => {
  test.setTimeout(15 * 60_000);
  const errors = watchErrors(page);
  const w = await installWallet(page);
  const me = w.address as Address;
  facts({ kind: "wallet", address: me, rpc: new URL(RPC).host });

  // ---- balances before ----
  const b0 = await balances(me);
  facts({ kind: "balances-before", ...b0.fmt });
  await page.goto("/");
  await step(page, `Wallet ${me.slice(0, 6)}…${me.slice(-4)}: ${Number(b0.fmt.usdc).toFixed(2)} tUSDC, ${Number(b0.fmt.eth).toFixed(5)} ETH, ${Number(b0.fmt.shares).toFixed(3)} AI Build-Out shares`);

  // ---- 1. Privy login with the injected wallet ----
  let siwe: { status: number; body: string } | null = null;
  page.on("response", async (r) => {
    if (/auth\.privy\.io\/api\/v1\/siwe\/authenticate/.test(r.url())) siwe = { status: r.status(), body: (await r.text().catch(() => "")).slice(0, 300) };
  });
  await step(page, "Sign in with the injected test wallet (Privy modal → wallet list → SIWE)");
  const t0 = Date.now();
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.locator("#privy-modal-content, [id*=privy]").getByText(/continue with a wallet/i).first().click();
  await page.locator("#privy-modal-content, [id*=privy]").getByText("Alloy E2E Wallet").first().click();
  const outcome = await Promise.race([
    page.getByText("Could not log in with wallet").waitFor({ timeout: 60_000 }).then(() => "refused" as const),
    page.waitForFunction(() => (localStorage.getItem("alloy:signer") ?? "").startsWith("external:"), null, { timeout: 60_000 }).then(() => "ok" as const),
  ]).catch(() => "timeout" as const);
  const signLog = w.log.filter((l) => l.method === "personal_sign").length;
  facts({ kind: "privy-login", outcome, ms: Date.now() - t0, personalSignCalls: signLog, siwe });
  const loggedIn = outcome === "ok";
  await keyShot(page, info, `privy-login-${outcome}`);
  await check(page, info, "Privy login with injected wallet (SIWE)", async () =>
    expect(loggedIn, `outcome=${outcome}; personal_sign calls=${signLog}; siwe/authenticate → ${JSON.stringify(siwe)}`).toBe(true),
  );

  if (loggedIn) {
    await realUiFlow(page, info, me, w.sent);
  } else {
    await step(page, `Privy refused the wallet login (${siwe ? (siwe as { status: number }).status : "?"}). Falling back: mocked UI + on-chain`);
    await page.keyboard.press("Escape").catch(() => undefined);
    await devTradeJourney(page, info);
    await onchainFlow(page, info, me);
  }
  const b9 = await balances(me);
  facts({ kind: "balances-after", ...b9.fmt });
  await step(page, `Done. Now ${Number(b9.fmt.usdc).toFixed(2)} tUSDC, ${Number(b9.fmt.shares).toFixed(3)} shares`);
  record("wallet page errors (info)", info.project.name, true, errors.slice(0, 8).join(" || "));
});

// ---------------------------------------------------------------------------
// 2a. real UI (only reachable if Privy allows wallet login)
// ---------------------------------------------------------------------------
async function realUiFlow(page: Page, info: Parameters<typeof check>[1], me: Address, sent: { hash: Hex; at: number }[]) {
  await check(page, info, "PreferEmbeddedWallet keeps the external wallet as signer", async () => {
    expect(await page.evaluate(() => localStorage.getItem("alloy:signer"))).toBe(`external:${me.toLowerCase()}`);
  });
  const bal = await balances(me);
  if (bal.usdc < 15_000_000n) {
    await step(page, "Add test money (Test mode menu → faucet relay)");
    await page.getByRole("button", { name: "Test mode" }).first().click();
    await page.getByText("Add test money").click();
    await expect.poll(async () => (await balances(me)).usdc, { timeout: 90_000 }).toBeGreaterThan(bal.usdc);
  }
  await page.goto(`/b/${AI_BUILD_OUT}`);
  const before = await balances(me);
  const panel = page.locator("#buy-panel");
  await step(page, "Buying $10 of The AI Build-Out…");
  await panel.getByRole("button", { name: "$10", exact: true }).click();
  const t0 = Date.now();
  await panel.locator("[data-buy-primary]").click();
  const confirm = page.getByRole("button", { name: "I confirm" });
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
  let receiptAt = 0;
  await expect
    .poll(async () => {
      const last = sent[sent.length - 1];
      if (!last || sent.length < 1) return false;
      const r = await pub.getTransactionReceipt({ hash: last.hash }).catch(() => null);
      if (r && !receiptAt) receiptAt = Date.now();
      return !!r;
    }, { timeout: 180_000 })
    .toBe(true);
  const inAt = await page.getByText("in.", { exact: false }).locator("xpath=ancestor-or-self::h2").first().waitFor({ timeout: 120_000 }).then(() => Date.now());
  facts({ kind: "ui-buy", ms: Date.now() - t0, receiptAt, inAt, txs: sent.map((s) => s.hash) });
  await check(page, info, "UI buy: You're in. only after receipt", async () => expect(inAt).toBeGreaterThanOrEqual(receiptAt));
  await check(page, info, "UI buy: no duplicate Bought toast", async () => expect(await page.locator("[data-sonner-toast]", { hasText: "Bought" }).count()).toBe(0));
  await check(page, info, "UI buy: shares increased on-chain", async () => expect((await balances(me)).shares).toBeGreaterThan(before.shares));
  await keyShot(page, info, "ui-buy-done");
  // sell 25%
  await page.getByRole("button", { name: "Done" }).click();
  await step(page, "Selling 25%…");
  const b1 = await balances(me);
  await page.getByRole("button", { name: "Sell", exact: true }).first().click();
  await page.getByRole("radio", { name: "25%" }).or(page.getByRole("button", { name: "25%" })).first().click();
  await page.getByRole("button", { name: /^Sell \$/ }).click();
  await check(page, info, "UI sell 25%: success pane", () => expect(page.getByText("Sent to your")).toBeVisible({ timeout: 180_000 }));
  await check(page, info, "UI sell 25%: USDC increased", async () => expect((await balances(me)).usdc).toBeGreaterThan(b1.usdc));
}

// ---------------------------------------------------------------------------
// 2b. fallback: mocked UI journey + on-chain via viem
// ---------------------------------------------------------------------------
async function devTradeJourney(page: Page, info: Parameters<typeof check>[1]) {
  await page.goto("/dev-trade?view=panel");
  await page.getByLabel("Amount in dollars").waitFor();
  await step(page, "Mocked buy (dev-trade): $10 → Approving → Pouring → Settling");
  await page.getByRole("button", { name: "$10", exact: true }).first().click();
  await page.locator("[data-buy-primary]").click();
  // "You're in." must not appear before the (mock) receipt: sample until done
  let early = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 30_000) {
    const st = await page.evaluate(() => (window as unknown as { __step?: string }).__step ?? "");
    const shown = await page.locator(".tr-done-h").isVisible().catch(() => false);
    if (shown && st !== "done") early = true;
    if (shown) break;
    await page.waitForTimeout(150);
  }
  await check(page, info, "mock buy: You're in. appears", () => expect(page.locator(".tr-done-h")).toBeVisible({ timeout: 15_000 }));
  await check(page, info, "mock buy: success only after receipt (step=done)", async () => expect(early).toBe(false));
  await check(page, info, "mock buy: no Bought toast", async () => expect(await page.locator("[data-sonner-toast]", { hasText: "Bought" }).count()).toBe(0));
  await keyShot(page, info, "mock-buy-done");
  await page.goto("/dev-trade?view=sell");
  await step(page, "Mocked sell (dev-trade): 25%");
  await page.getByRole("radio", { name: "25%" }).or(page.getByRole("button", { name: "25%" })).first().click();
  await page.getByRole("button", { name: /^Sell \$/ }).click();
  await check(page, info, "mock sell 25%: Sent to your wallet.", () => expect(page.getByText("Sent to your")).toBeVisible({ timeout: 30_000 }));
  await keyShot(page, info, "mock-sell-done");
}

type ApiQuote = { data: { expectedResult: string; minResult: string; legs: { minOut: string }[] } };
async function quote(side: "buy" | "sell", amount: bigint) {
  const r = await fetch(`${API}/quote?chainId=84532&basket=${AI_BUILD_OUT}&side=${side}&amount=${amount}&slippageBps=100`);
  if (!r.ok) throw new Error(`quote ${side} ${r.status} ${await r.text()}`);
  const q = (await r.json()) as ApiQuote;
  return { minOuts: q.data.legs.map((l) => BigInt(l.minOut)), min: BigInt(q.data.minResult), expected: BigInt(q.data.expectedResult) };
}

async function onchainFlow(page: Page, info: Parameters<typeof check>[1], me: Address) {
  const account = privateKeyToAccount(process.env.E2E_PK as Hex);
  const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC, { retryCount: 3 }) });
  await page.goto(`/b/${AI_BUILD_OUT}`);

  // faucet relay if needed
  let bal = await balances(me);
  if (bal.usdc < 15_000_000n) {
    await step(page, `tUSDC ${bal.fmt.usdc} < $15: asking the faucet relay (POST /faucet/drip)`);
    const t0 = Date.now();
    const r = await fetch(`${API}/faucet/drip`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chainId: 84532, address: me }) });
    const body = await r.text();
    facts({ kind: "faucet", status: r.status, body: body.slice(0, 300), ms: Date.now() - t0 });
    await check(page, info, "faucet relay drips tUSDC", async () => {
      expect(r.status, body.slice(0, 200)).toBeGreaterThanOrEqual(200);
      expect(r.status).toBeLessThan(300); // relay answers 202 Accepted
      const hash = JSON.parse(body).data.txHash as Hex;
      await pub.waitForTransactionReceipt({ hash, timeout: 90_000 });
      await expect.poll(async () => (await balances(me)).usdc, { timeout: 30_000 }).toBeGreaterThan(bal.usdc);
      facts({ kind: "faucet-tx", hash, ms: Date.now() - t0 });
    });
    bal = await balances(me);
  }
  if (bal.usdc < 10_000_000n) {
    record("on-chain buy $10", info.project.name, false, `skipped: only ${bal.fmt.usdc} tUSDC`);
    return;
  }

  // buy $10
  const usdcIn = 10_000_000n;
  await step(page, "On-chain: buying $10 of The AI Build-Out (quote → approve → simulate → buy)…");
  const tb = Date.now();
  await check(page, info, "on-chain buy $10 via AlloyRouter (shares increase)", async () => {
    const q = await quote("buy", usdcIn);
    const tq = Date.now();
    const approve = await wc.writeContract({ address: USDC, abi: erc20Abi, functionName: "approve", args: [ROUTER, usdcIn] });
    await pub.waitForTransactionReceipt({ hash: approve });
    const ta = Date.now();
    const sim = await pub.simulateContract({ account, address: ROUTER, abi: alloyRouterAbi, functionName: "buy", args: [AI_BUILD_OUT, usdcIn, q.minOuts, q.min] });
    const hash = await wc.writeContract(sim.request);
    const rc = await pub.waitForTransactionReceipt({ hash });
    const after = await balances(me);
    facts({ kind: "buy", approve, hash, status: rc.status, quoteMs: tq - tb, approveMs: ta - tq, buyMs: Date.now() - ta, totalMs: Date.now() - tb, expectedShares: formatUnits(q.expected, 18), sharesBefore: bal.fmt.shares, sharesAfter: after.fmt.shares, usdcAfter: after.fmt.usdc });
    expect(rc.status).toBe("success");
    expect(after.shares).toBeGreaterThan(bal.shares);
  });

  // sell 25%
  const b1 = await balances(me);
  const shares = b1.shares / 4n;
  await step(page, `On-chain: selling 25% (${Number(formatUnits(shares, 18)).toFixed(3)} shares)…`);
  const ts = Date.now();
  await check(page, info, "on-chain sell 25% via AlloyRouter (USDC increases)", async () => {
    const q = await quote("sell", shares);
    const tq = Date.now();
    const approve = await wc.writeContract({ address: AI_BUILD_OUT, abi: erc20Abi, functionName: "approve", args: [ROUTER, shares] });
    await pub.waitForTransactionReceipt({ hash: approve });
    const ta = Date.now();
    const sim = await pub.simulateContract({ account, address: ROUTER, abi: alloyRouterAbi, functionName: "sell", args: [AI_BUILD_OUT, shares, q.minOuts, q.min] });
    const hash = await wc.writeContract(sim.request);
    const rc = await pub.waitForTransactionReceipt({ hash });
    const after = await balances(me);
    facts({ kind: "sell", approve, hash, status: rc.status, quoteMs: tq - ts, approveMs: ta - tq, sellMs: Date.now() - ta, totalMs: Date.now() - ts, expectedUsdc: formatUnits(q.expected, 6), usdcBefore: b1.fmt.usdc, usdcAfter: after.fmt.usdc, sharesAfter: after.fmt.shares });
    expect(rc.status).toBe("success");
    expect(after.usdc).toBeGreaterThan(b1.usdc);
  });
  await page.reload();
  await keyShot(page, info, "onchain-done");
}
