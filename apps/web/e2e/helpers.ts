import { expect, type Page, type TestInfo } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";

export const OUT = process.env.E2E_OUT || "/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/e2e";
mkdirSync(`${OUT}/shots`, { recursive: true });
export const HEADED = process.env.E2E_HEADLESS !== "1";
export const PAUSE = HEADED ? Number(process.env.E2E_PAUSE ?? 1500) : 200;

/** Known noise we don't count as failures. */
const NOISE = [
  /429/, /Too Many Requests/i, /blockscout/i, /WalletConnect Core is already initialized/i, /Init\(\) was called/i,
  /ReadPixels/i, /GPU stall/i, /walletconnect/i, /pulse\.walletconnect/i, /explorer-api\.walletconnect/i,
  /Download the React DevTools/i, /\[HMR\]/, /Fast Refresh/i,
];
export const isNoise = (t: string) => NOISE.some((r) => r.test(t));

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => { const t = `pageerror: ${e.message}`; if (!isNoise(t)) errors.push(t.slice(0, 400)); });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = `console: ${m.text()} ${m.location()?.url ?? ""}`;
    if (!isNoise(t)) errors.push(t.slice(0, 400));
  });
  return errors;
}

/** Results ledger (one JSON line per check) the report is built from. */
export function record(check: string, project: string, ok: boolean, detail = "") {
  appendFileSync(`${OUT}/checks.jsonl`, JSON.stringify({ at: new Date().toISOString(), check, project, ok, detail }) + "\n");
}

/** Run a named check: soft — records pass/fail, screenshots on failure, never aborts the test. */
export async function check(page: Page, info: TestInfo, name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    record(name, info.project.name, true);
    return true;
  } catch (e) {
    const shot = `${OUT}/shots/${info.project.name}-${name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.png`;
    await page.screenshot({ path: shot }).catch(() => undefined);
    const msg = (e as Error).message.replace(/\u001b\[[0-9;]*m/g, "").split("\n").filter(Boolean).slice(0, 4).join(" | ").slice(0, 400);
    record(name, info.project.name, false, `${msg} [${shot}]`);
    expect.soft(false, `${name}: ${msg}`).toBe(true);
    return false;
  }
}

/** Caption overlay (top-left) so a person watching can follow; re-applied after each navigation. */
const captions = new WeakMap<Page, string>();
export async function caption(page: Page, text: string) {
  if (!captions.has(page)) {
    page.on("load", () => void paint(page, captions.get(page) ?? ""));
  }
  captions.set(page, text);
  await paint(page, text);
  if (HEADED) await page.waitForTimeout(PAUSE);
}
async function paint(page: Page, text: string) {
  if (!HEADED) return;
  await page
    .evaluate((t) => {
      let el = document.getElementById("__e2e_caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "__e2e_caption";
        el.setAttribute("aria-hidden", "true");
        el.style.cssText =
          "position:fixed;top:8px;left:8px;z-index:2147483647;max-width:min(520px,calc(100vw - 16px));padding:8px 12px;border-radius:10px;" +
          "background:rgba(20,90,60,.92);color:#fff;font:600 13px/1.35 -apple-system,system-ui,sans-serif;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.4)";
        document.documentElement.appendChild(el);
      }
      el.textContent = t;
    }, text)
    .catch(() => undefined);
}

export async function noHorizontalOverflow(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(r.sw, `scrollWidth ${r.sw} > clientWidth ${r.cw}`).toBeLessThanOrEqual(r.cw + 1);
}

export async function keyShot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: `${OUT}/shots/key-${info.project.name}-${name}.png` }).catch(() => undefined);
}
