/**
 * Part A: signed-out UI smoke. Runs once per project (desktop 1440x900, phone 390x844) in one shared window.
 */
import { expect, test, type Page } from "@playwright/test";
import { caption, check, keyShot, noHorizontalOverflow, watchErrors } from "./helpers";

const AI = "0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3";
const ROUTES: [string, number][] = [
  ["/", 200], ["/explore", 200], [`/b/${AI}`, 200], ["/portfolio", 200], ["/activity", 200], ["/create", 200],
  ["/creator/alloy_fi", 200], ["/creator/meera_invests", 200], ["/me", 200], ["/nope-e2e-404", 404],
];

let page: Page;
let errors: string[];
let total = 0;
const n = () => ++total;

test.beforeAll(async ({ browser }, info) => {
  const ctx = await browser.newContext(info.project.use);
  // The Next.js dev-tools pill (bottom-left, dev only) sits on top of the phone tab bar's Explore tab and eats taps.
  await ctx.addInitScript(() => {
    const css = "nextjs-portal{display:none!important}";
    const add = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
    if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add);
  });
  page = await ctx.newPage();
  errors = watchErrors(page);
});
test.afterAll(async () => {
  await page.context().close();
});

const isPhone = () => (page.viewportSize()?.width ?? 1440) < 768;

async function settle(ms = 2500) {
  await page.locator('a[aria-label="Alloy home"]').first().waitFor({ state: "attached", timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}

test("routes load (200, no errors, no phone overflow)", async ({}, info) => {
  for (const [path, want] of ROUTES) {
    await caption(page, `Step ${n()}: open ${path}`);
    errors.length = 0;
    const t0 = Date.now();
    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    await settle();
    const ms = Date.now() - t0;
    await check(page, info, `route ${path} status ${want}`, async () => expect(res?.status()).toBe(want));
    if (want === 404) await check(page, info, "404 shows melted page", () => expect(page.getByText("melted.")).toBeVisible());
    // On a 404 page Privy's COOP self-check re-fetches the URL and logs "Error checking Cross-Origin-Opener-Policy: 404": expected noise there.
    const errs = want === 404 ? errors.filter((e) => !/status of 404|Cross-Origin-Opener-Policy: HTTP error! status: 404/.test(e)) : [...errors];
    await check(page, info, `route ${path} no console/page errors`, async () => {
      if (errs.length) throw new Error(`${errs.length} error(s) (${ms}ms load): ${errs.join(" || ")}`);
    });
    if (isPhone()) await check(page, info, `route ${path} no horizontal overflow`, () => noHorizontalOverflow(page));
  }
});

test("nav links", async ({}, info) => {
  await page.goto("/");
  await settle();
  await caption(page, `Step ${n()}: click through the main nav`);
  const nav = isPhone() ? page.locator('nav.c-nav[aria-label="Main"]') : page.locator('nav.a-links[aria-label="Main"]');
  const targets = isPhone() ? ["Explore", "Portfolio", "Activity", "Me"] : ["Explore", "Portfolio", "Activity", "Create"];
  if (isPhone()) {
    // the phone landing has no bottom bar; start from Portfolio
    await page.goto("/portfolio");
    await settle(1000);
    await nav.waitFor({ state: "visible" });
  }
  for (const label of targets) {
    await check(page, info, `nav → ${label}`, async () => {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${label.toLowerCase()}`));
      await page.waitForTimeout(800);
    });
  }
  await check(page, info, "nav → home logo", async () => {
    await page.locator('a[aria-label="Alloy home"]').first().click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });
});

test("explore filters, sort, card link", async ({}, info) => {
  await page.goto("/explore");
  await settle(1000);
  const cards = page.locator('a[href^="/b/"]:not([href*="?buy"])');
  await check(page, info, "explore shows basket cards", () => expect(cards.first()).toBeVisible({ timeout: 45_000 }));
  const names = async () => (await cards.allInnerTexts()).map((s) => s.trim().split("\n")[0]);
  const before = await names();
  await caption(page, `Step ${n()}: Explore, ${before.length} baskets. Pick a theme filter`);
  const themes = page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio");
  const themeCount = await themes.count();
  let changed = false;
  let detail = "";
  for (let i = 1; i < themeCount && !changed; i++) {
    const t = themes.nth(i);
    const label = (await t.innerText()).trim();
    await t.click();
    await page.waitForTimeout(1500);
    const after = await names();
    detail += `${label}:${after.length} `;
    changed = after.join("|") !== before.join("|");
  }
  await check(page, info, "explore theme filter changes card set", async () => expect(changed, `before ${before.length}; ${detail}`).toBe(true));
  await themes.first().click();
  await page.waitForTimeout(1200);
  await caption(page, `Step ${n()}: sort by Best 1Y, then New`);
  const sort = page.getByRole("radiogroup", { name: "Sort" });
  const pop = await names();
  await sort.getByRole("radio", { name: "Best 1Y" }).click();
  await page.waitForTimeout(1500);
  const best = await names();
  await sort.getByRole("radio", { name: "New" }).click();
  await page.waitForTimeout(1500);
  const neu = await names();
  await check(page, info, "explore sort changes order", async () =>
    expect(best.join("|") !== pop.join("|") || neu.join("|") !== pop.join("|"), `popular=${pop.join(",")} best=${best.join(",")} new=${neu.join(",")}`).toBe(true),
  );
  await keyShot(page, info, "explore");
  await caption(page, `Step ${n()}: open a basket card`);
  await check(page, info, "explore card links to /b/…", async () => {
    await cards.first().click();
    await expect(page).toHaveURL(/\/b\/0x[0-9a-fA-F]{40}/);
  });
});

async function youGet(): Promise<number> {
  const vals = await page.locator(".tr-rows b .a-odo").evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute("aria-label") ?? ""));
  return vals.reduce((s, v) => s + Number(v.replace(/[^0-9.]/g, "") || 0), 0);
}

test("basket page: recipe, chart, buy panel / sheet", async ({}, info) => {
  await page.goto(`/b/${AI}`);
  await settle(3000);
  await caption(page, `Step ${n()}: The AI Build-Out basket page`);
  await check(page, info, "basket shows recipe", () => expect(page.getByText(/^Recipe$/).first()).toBeVisible({ timeout: 30_000 }));
  await check(page, info, "basket shows chart", async () => {
    const chart = page.locator('[role="img"][aria-label^="Value"], [role="img"][aria-label^="The stocks inside"], svg.v-wipe');
    await expect(chart.first()).toBeAttached({ timeout: 30_000 });
  });
  if (isPhone()) {
    await caption(page, `Step ${n()}: open the Buy sheet`);
    await check(page, info, "phone Buy sheet opens", async () => {
      await page.getByRole("button", { name: /Buy from \$5|Buy more/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  }
  const scope = isPhone() ? page.getByRole("dialog") : page.locator("#buy-panel");
  await check(page, info, "buy panel visible with amount input", () => expect(scope.getByLabel("Amount in dollars")).toBeVisible());
  for (const amt of [10, 25, 100]) {
    await caption(page, `Step ${n()}: pick $${amt}: "You get" split should add up to $${amt}`);
    await check(page, info, `chip $${amt} updates You get split`, async () => {
      await scope.getByRole("radio", { name: `$${amt}` }).or(scope.getByRole("button", { name: `$${amt}`, exact: true })).first().click();
      await expect.poll(youGet, { timeout: 8000 }).toBeGreaterThan(amt - 0.05);
      expect(await youGet()).toBeLessThan(amt + 0.05);
    });
  }
  await keyShot(page, info, "buy-panel-100");
  await caption(page, `Step ${n()}: type $3: should say "Minimum is $5"`);
  const input = scope.getByLabel("Amount in dollars");
  await input.fill("3");
  await page.waitForTimeout(600);
  await check(page, info, 'typing $3 shows "Minimum is $5"', () => expect(scope.locator(".tr-min.on")).toBeVisible());
  const primary = scope.locator("[data-buy-primary]");
  const label = (await primary.innerText()).trim();
  const disabled = await primary.isDisabled();
  await check(page, info, "$3: signed-out primary button state", async () =>
    expect(label === "Sign in to buy" || disabled, `label="${label}" disabled=${disabled}`).toBe(true),
  );
  await keyShot(page, info, "buy-min");
  await input.fill("25");
  if (isPhone()) await page.keyboard.press("Escape");
  await check(page, info, "signed-out basket page: Sell hidden (no holding)", async () =>
    expect(await page.getByRole("button", { name: "Sell", exact: true }).count()).toBe(0),
  );
});

test("dev-trade (mock wallet): min $5 disables Buy, Sell entry", async ({}, info) => {
  await page.goto(`/dev-trade?view=${isPhone() ? "buy" : "panel"}`);
  await settle(2500);
  const input = page.getByLabel("Amount in dollars");
  await caption(page, `Step ${n()}: mock-signed-in buy: $3 must disable Buy`);
  await input.fill("3");
  await check(page, info, "signed-in: $3 disables Buy (Minimum is $5)", async () => {
    const b = page.locator("[data-buy-primary]");
    await expect(b).toBeDisabled();
    await expect(b).toHaveText(/Minimum is \$5/);
  });
  await input.fill("10");
  await check(page, info, "signed-in: $10 enables Buy $10.00", () => expect(page.locator("[data-buy-primary]")).toBeEnabled());
  await page.goto("/dev-trade?view=sell");
  await settle(2500);
  await caption(page, `Step ${n()}: Sell sheet (25% / 50% / All)`);
  await check(page, info, "Sell sheet shows 25/50/All + Sell button", async () => {
    await expect(page.getByRole("radio", { name: "25%" }).or(page.getByRole("button", { name: "25%" })).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sell( all)? \$/ })).toBeVisible();
  });
});

test("create validation", async ({}, info) => {
  await page.goto("/create");
  await settle(2500);
  await caption(page, `Step ${n()}: Create: "Cast it" is off until the form is valid`);
  const cast = page.getByRole("button", { name: /Cast it|Sign in/ });
  await check(page, info, "create: Cast disabled when empty", () => expect(page.getByRole("button", { name: "Cast it" })).toBeDisabled());
  await page.getByPlaceholder("e.g. Cloud Landlords").fill("E2E Test Basket");
  await page.getByPlaceholder("CLD").fill("ETB");
  for (const t of ["NVDA", "MSFT", "GOOGL"]) await page.getByRole("button", { name: new RegExp(`^${t}`) }).first().click();
  await page.getByPlaceholder("What do these companies have in common?").fill("Chips, cloud and search: the AI build-out.");
  await page.getByRole("button", { name: "Even split" }).click().catch(() => undefined);
  await page.getByText("Let winners run", { exact: true }).first().click();
  await page.getByLabel("Your own money, in test dollars").fill("25");
  await page.waitForTimeout(800);
  await keyShot(page, info, "create-filled");
  const st = await cast.first().evaluate((e) => ({ t: e.textContent?.trim(), d: (e as HTMLButtonElement).disabled }));
  await check(page, info, "create: valid form enables Cast (or asks to sign in)", async () => expect(st.d, JSON.stringify(st) + " why=" + (await page.locator(".cs-cast .why, .why").first().innerText().catch(() => "?"))).toBe(false));
});

test("test mode menu", async ({}, info) => {
  await page.goto("/explore");
  await settle(1500);
  await caption(page, `Step ${n()}: open the Test mode menu`);
  await check(page, info, "Test mode menu opens", async () => {
    await page.getByRole("button", { name: "Test mode" }).first().click();
    await expect(page.getByText("Prices are real. The money is pretend.")).toBeVisible();
  });
  await keyShot(page, info, "test-menu");
  await page.keyboard.press("Escape");
});
