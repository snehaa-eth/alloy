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
const TOTAL = 6;
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
  const modal = page.locator("#privy-modal-content, [id*=privy]");
  const search = modal.getByPlaceholder(/Search through/i);
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) await search.fill("Alloy E2E");
  await modal.getByText("Alloy E2E Wallet").first().scrollIntoViewIfNeeded().catch(() => undefined);
  await modal.getByText("Alloy E2E Wallet").first().click();
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
  } else if (process.env.E2E_NO_FALLBACK === "1") {
    await keyShot(page, info, "privy-login-failed");
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
async function realUiFlow(page: Page, info: Parameters<typeof check>[1], me: Address, sent: { hash: Hex; to?: string; at: number }[]) {
  await check(page, info, "PreferEmbeddedWallet keeps the external wallet as signer", async () => {
    expect(await page.evaluate(() => localStorage.getItem("alloy:signer"))).toBe(`external:${me.toLowerCase()}`);
  });
  // Which wallet is active? The header account chip shows the active (wagmi) address.
  const chip = async () => (await page.getByRole("button", { name: "Your account" }).first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const short = `${me.slice(0, 6)}…${me.slice(-4)}`.toLowerCase();
  await page.waitForTimeout(5000);
  const chip1 = await chip();
  facts({ kind: "active-wallet-after-login", chip: chip1, wallets: await page.evaluate(() => localStorage.getItem("alloy:signer")) });
  await keyShot(page, info, "ui-signed-in");
  await check(page, info, "after login: header/active wallet is the external wallet", async () => expect(chip1.toLowerCase(), chip1).toContain(short));
  if (!chip1.toLowerCase().includes(short)) {
    await step(page, "Active wallet is the embedded one; reloading to see if PreferEmbeddedWallet corrects it");
    await page.reload();
    await page.waitForTimeout(8000);
    const chip2 = await chip();
    facts({ kind: "active-wallet-after-reload", chip: chip2 });
    await keyShot(page, info, "ui-after-reload");
    await check(page, info, "after reload: active wallet is the external wallet", async () => expect(chip2.toLowerCase(), chip2).toContain(short));
  }
  const bal = await balances(me);
  if (bal.usdc < 15_000_000n) {
    await step(page, "Add test money (Test mode menu → faucet relay)");
    await page.getByRole("button", { name: "Test mode" }).first().click();
    await page.getByText("Add test money").click();
    await expect.poll(async () => (await balances(me)).usdc, { timeout: 90_000 }).toBeGreaterThan(bal.usdc);
  }
  await page.goto(`/b/${AI_BUILD_OUT}`);
  await page.waitForTimeout(3000);
  const before = await balances(me);
  const panel = page.locator("#buy-panel");
  await step(page, "Buying $10 of The AI Build-Out through the buy panel");
  await panel.getByRole("radio", { name: "$10" }).or(panel.getByRole("button", { name: "$10", exact: true })).first().click();
  await page.waitForTimeout(800);
  const nSent = sent.length;
  const t0 = Date.now();
  await panel.locator("[data-buy-primary]").click();
  const routerTx = () => sent.slice(nSent).find((x) => x.to?.toLowerCase() === ROUTER.toLowerCase());
  // Sample the panel: status titles seen, when the buy tx was sent / mined, when "You're in." shows.
  const seen: string[] = [];
  let doneAt = 0, earlyDone = false, attested = false, sawToast = false, receiptSeenAt = 0;
  const shots = new Set<string>();
  while (Date.now() - t0 < 240_000) {
    const confirm = page.getByRole("button", { name: "I confirm" });
    if (!attested && (await confirm.isVisible().catch(() => false))) { attested = true; await confirm.click(); seen.push("attest"); }
    const title = ((await panel.locator(".tr-pane").first().innerText().catch(() => "")).split("\n").find((l) => /Approv|Pour|Settl|Sign|Confirm|Check|Quot|Wait|Switch/i.test(l)) ?? "").trim();
    if (title && seen[seen.length - 1] !== title) {
      seen.push(title);
      const key = /approv/i.test(title) ? "approving" : /pour/i.test(title) ? "pouring" : /settl/i.test(title) ? "settling" : "";
      if (key && !shots.has(key)) { shots.add(key); await keyShot(page, info, `ui-buy-${key}`); await caption(page, `Buying $10: ${title}`).catch(() => undefined); }
    }
    if (await page.locator("[data-sonner-toast]", { hasText: "Bought" }).count()) sawToast = true;
    const rt = routerTx();
    if (rt && !receiptSeenAt && (await pub.getTransactionReceipt({ hash: rt.hash }).catch(() => null))) receiptSeenAt = Date.now();
    if (await panel.locator(".tr-done-h").isVisible().catch(() => false)) {
      doneAt = Date.now();
      // success shown ⇒ the buy receipt must already exist
      if (!rt || !(await pub.getTransactionReceipt({ hash: rt.hash }).catch(() => null))) earlyDone = true;
      break;
    }
    if (await panel.locator(".tr-err").isVisible().catch(() => false)) { seen.push("ERROR: " + (await panel.locator(".tr-err").innerText()).replace(/\s+/g, " ")); break; }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(2500);
  if (await page.locator("[data-sonner-toast]", { hasText: "Bought" }).count()) sawToast = true;
  const buyTxs = sent.slice(nSent).map((x) => ({ to: x.to, hash: x.hash, sentMs: x.at - t0 }));
  facts({ kind: "ui-buy", totalMs: (doneAt || Date.now()) - t0, receiptSeenMs: receiptSeenAt ? receiptSeenAt - t0 : null, doneMs: doneAt ? doneAt - t0 : null, seen, txs: buyTxs });
  await keyShot(page, info, "ui-buy-done");
  await check(page, info, "UI buy: \"You're in.\" shown", async () => expect(doneAt, seen.join(" > ")).toBeGreaterThan(0));
  await check(page, info, "UI buy: success only after the buy receipt", async () => expect(earlyDone).toBe(false));
  await check(page, info, "UI buy: tx went to AlloyRouter from the external wallet", async () => expect(routerTx(), JSON.stringify(buyTxs)).toBeTruthy());
  await check(page, info, "UI buy: no duplicate Bought toast", async () => expect(sawToast).toBe(false));
  const afterBuy = await balances(me);
  facts({ kind: "ui-buy-balances", sharesBefore: before.fmt.shares, sharesAfter: afterBuy.fmt.shares, usdcBefore: before.fmt.usdc, usdcAfter: afterBuy.fmt.usdc });
  await check(page, info, "UI buy: shares increased on-chain", async () => expect(afterBuy.shares).toBeGreaterThan(before.shares));
  await check(page, info, "UI buy: USDC decreased by about $10", async () => expect(Number(before.usdc - afterBuy.usdc) / 1e6).toBeCloseTo(10, 0));

  // ---- sell 25% ----
  await panel.getByRole("button", { name: "Done" }).click().catch(() => undefined);
  await page.waitForTimeout(2000);
  await step(page, "Selling 25% through the Sell sheet");
  const b1 = await balances(me);
  await page.getByRole("button", { name: "Sell", exact: true }).filter({ visible: true }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: "25%" }).or(sheet.getByRole("button", { name: "25%" })).first().click();
  await page.waitForTimeout(1500);
  const sellLabel = (await sheet.getByRole("button", { name: /^Sell \$/ }).innerText()).trim();
  const nSell = sent.length;
  const ts = Date.now();
  await sheet.getByRole("button", { name: /^Sell \$/ }).click();
  const sseen: string[] = [];
  let sawUsdcLabel = false, sdoneAt = 0;
  while (Date.now() - ts < 240_000) {
    const confirm = page.getByRole("button", { name: "I confirm" });
    if (await confirm.isVisible().catch(() => false)) { await confirm.click(); sseen.push("attest"); }
    const txt = await sheet.innerText().catch(() => "");
    if (/→ USDC/.test(txt) && !sawUsdcLabel) { sawUsdcLabel = true; sseen.push((txt.match(/\$[0-9.,]+ → USDC/) ?? ["→ USDC"])[0]); await keyShot(page, info, "ui-sell-convert"); }
    const t = (txt.split("\n").find((l) => /Approv|Pinch|Convert|Send|Sign|Confirm|Check|Quot|Wait/i.test(l)) ?? "").trim();
    if (t && sseen[sseen.length - 1] !== t) sseen.push(t);
    if (/Sent to your|Basket sold/.test(txt)) { sdoneAt = Date.now(); break; }
    if (/Nothing was sold/.test(txt)) { sseen.push("ERROR: " + txt.replace(/\s+/g, " ").slice(0, 300)); break; }
    await page.waitForTimeout(250);
  }
  await keyShot(page, info, "ui-sell-done");
  const b2 = await balances(me);
  const sellTxs = sent.slice(nSell).map((x) => ({ to: x.to, hash: x.hash, sentMs: x.at - ts }));
  facts({ kind: "ui-sell", button: sellLabel, totalMs: (sdoneAt || Date.now()) - ts, seen: sseen, txs: sellTxs, usdcBefore: b1.fmt.usdc, usdcAfter: b2.fmt.usdc, sharesBefore: b1.fmt.shares, sharesAfter: b2.fmt.shares });
  await check(page, info, "UI sell 25%: success pane", async () => expect(sdoneAt, sseen.join(" > ")).toBeGreaterThan(0));
  await check(page, info, "UI sell 25%: \"$X → USDC\" label shown", async () => expect(sawUsdcLabel).toBe(true));
  await check(page, info, "UI sell 25%: USDC increased on-chain", async () => expect(b2.usdc).toBeGreaterThan(b1.usdc));
  await check(page, info, "UI sell 25%: about 25% of shares sold", async () => expect(Number((b1.shares - b2.shares) * 1000n / b1.shares) / 1000).toBeCloseTo(0.25, 1));
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
