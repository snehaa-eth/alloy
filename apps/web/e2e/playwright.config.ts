import { defineConfig } from "@playwright/test";

/**
 * Alloy e2e. Runs against the already-running dev server (no webServer). Uses the system Google Chrome
 * (channel "chrome") so no browser download is needed.
 * Headed + slowMo by default so a person can watch; E2E_HEADLESS=1 for a quiet run.
 * Run: npm run e2e   (from apps/web; loads the seeded testnet follower key via e2e/run.mjs)
 */
const OUT = process.env.E2E_OUT || "/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/e2e";
const headless = process.env.E2E_HEADLESS === "1";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  outputDir: `${OUT}/results`,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["json", { outputFile: `${OUT}/report.json` }]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless,
    launchOptions: { slowMo: headless ? 0 : Number(process.env.E2E_SLOWMO ?? 400) },
    video: "off",
    trace: "off",
    screenshot: "only-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
  },
  projects: [
    { name: "desktop", testMatch: /smoke\.spec\.ts$/, use: { viewport: { width: 1440, height: 900 } } },
    { name: "wallet", testMatch: /wallet\.spec\.ts$/, use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone", testMatch: /smoke\.spec\.ts$/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
