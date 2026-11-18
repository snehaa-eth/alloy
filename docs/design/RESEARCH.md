# Alloy: UX research

Round 1, 2026-11-19. Written for the founder to discuss direction before any UI is built.

**How this was done.** Desk research with web search, plus product knowledge of the apps listed. I could not log in to or screen-record any app. Claims marked *(verify)* come from secondary sources or memory and should be checked in the live product before anyone quotes them. Citations are at the bottom; numbers in brackets like [3] point to them.

---

## 1. The five findings that matter most

1. **The trust problem in copy-investing is "leaders win, followers lose."** eToro answers it with a risk score and a whole-copy stop-loss [5][6]. Hyperliquid answers it with mandatory leader skin-in-the-game and a visible leader equity share [12][13]. smallcase answers it with "managed by" and SEBI registration [2][19]. **Alloy's answer is to show follower PnL next to creator PnL, plus the creator's own stake.** Nobody else in this set puts both numbers side by side on the product page. Make it the hero element of the basket page, not a tab.

2. **Rebalances are where these products earn or lose trust.** smallcase requires the user to act on every rebalance update, and users complain about the effort ("Rebalance All" is a recurring request) [1][4]. Reserve runs rebalances through governance and auctions that retail can't read [9][10]. Alloy auto-rebalances, so the job flips: **we must explain, not ask.** Every change gets a one-line reason, a cost, and (for recipe changes) a 24h countdown with a one-tap exit. Do not copy smallcase's "confirm each update" flow.

3. **Wallet setup should not feel like crypto.** Coinbase Smart Wallet shows the bar: a passkey and no seed phrase, in roughly 15 seconds *(Coinbase-reported, verify)* [15][16]. Privy embedded wallets plus gas sponsorship give us the same thing. The word "wallet" can appear once, in settings. Onboarding should say "account".

4. **The friction should sit on irreversible actions only.** Robinhood uses a swipe to confirm irreversible sends and a light tap for routine orders [17][18]. Baymard found mobile users mistake a review step for the confirmation and leave [19b]. For Alloy: one review sheet, one hold-to-confirm on buy and sell, and a clear "Done" state with a receipt. No extra modals.

5. **Discovery in this category is theme-first, not ticker-first.** feel.cash groups stocks by culture themes ("Big tech", "AI & chips", "Pre-IPO") [14]. smallcase groups by strategy and theme, and Autopilot and Dub sell people ("Pelosi tracker", "pilots") [7][8]. Alloy should lead with **stories and creators**: cards that show the thesis line, top 3 holdings, follower PnL, and creator stake. Hide raw tickers until the second tap.

---

## 2. Product-by-product

### smallcase (India)
- **What it is.** Themed stock portfolios built by SEBI-registered managers and bought through your existing broker.
- **Patterns.**
  - The product page shows the manager, a fee type ("Fee Based"), the minimum investment, a volatility label, and the last and next rebalance dates [2][3].
  - The minimum investment floats with stock prices, often ₹5k–50k [3]. That is a real barrier.
  - Rebalance updates arrive by email, SMS and in-app, and the user must apply each one. Missed updates stay pending until the next one arrives [1][4].
- **Steal.**
  - "Last rebalance / Next rebalance" on the product page.
  - "Managed by" with a credential badge.
  - A one-word volatility label.
  - Theme naming.
- **Avoid.**
  - A manual rebalance chore per basket.
  - A high, floating minimum. Ours is $5.
  - Making users leave for a broker.

### Robinhood
- **Patterns.**
  - One big number and one line chart per screen.
  - A time-range chip row under the chart.
  - The chart line colour flips with the day's direction.
  - The order flow is one screen: amount keypad, then review, then swipe or tap.
  - Swipe-up is used on irreversible sends [17][18].
  - Regulators flagged the gamification (confetti, push nudges) [18b].
- **Steal.**
  - The single-number hero.
  - Range chips.
  - The amount keypad with presets.
  - Swipe or hold to confirm.
- **Avoid.**
  - Confetti on trades.
  - Notifications that nudge trading.
  - Colouring the whole UI by the day's PnL. That would fight our burgundy.

### Coinbase (app + tokenized stocks)
- **Patterns.**
  - Tokenized US stocks went live on Base for non-US customers in Aug 2026, starting with NVDAc, METAc, AAPLc and GOOGLc [20][21].
  - Asset pages are calm: price, chart, "About", then stats.
  - Smart Wallet uses passkeys and no seed phrase [15][16].
- **Steal.**
  - The passkey-first account.
  - "About this asset" written in plain English.
  - Plain asset pages with stats in a 2-column grid.
- **Avoid.**
  - Implying any relationship. We never say "backed by" or "partnered with Coinbase/Base" (ARCHITECTURE §7).
  - Dense "everything app" navigation.

### eToro CopyTrader + Smart Portfolios
- **Patterns.**
  - A 1–10 risk score on every trader.
  - Traders at a high score can't take new copiers [5].
  - Copy Stop Loss closes the whole copy at a % loss, defaulting to 10% for Smart Portfolios [6].
  - A UK Ombudsman complaint involved a CSL the user didn't expect and a risk-level change he wasn't told about [6b].
- **Steal.**
  - A simple 1–5 risk dot (already on our "Nice" list).
  - Copier counts.
  - The "% of copiers in profit" idea, which our follower PnL does better.
- **Avoid.**
  - Silent risk changes. Every Alloy change gets a reason and a notice.
  - Stop-loss defaults that users didn't choose.

### Autopilot
- **Patterns.**
  - Sells named portfolios ("Pelosi Tracker") and calls their managers "pilots" [7].
  - Disclosure lag (45-day filings, about 2 weeks average) is mentioned in reviews [7b].
  - Connects to an existing broker. Lets you pause, switch, or rebalance anytime [7].
- **Steal.**
  - The story-first naming.
  - Being honest about disclosure lag. We must show the disclosure date (§7).
- **Avoid.**
  - Implying affiliation with the person tracked.
  - A high minimum. One reviewer said it's "only worth it if you've got serious cash" [7c].

### Dub
- **Patterns.**
  - A social feed of creators you swipe through.
  - Creators must invest at least $1,000 and publish their portfolio. They earn through a creator program [8].
  - Users complain fees aren't clear [8b].
- **Steal.**
  - **Creator minimum stake.** It maps directly to our "creator's own stake".
  - The creator profile as a product.
- **Avoid.**
  - Unclear fees. Alloy shows "1%/yr, about $0.08 a month on $100" next to the buy button.

### Reserve Index DTFs (app.reserve.org)
- **Patterns.**
  - Basket tokens on Base, including a MAG7 DTF.
  - Rebalances via on-chain Dutch auctions. Basket changes are governed by vote-locked tokens [9][10].
  - The UI reads like a governance console.
- **Steal.**
  - Showing the basket token and the underlying assets.
  - Showing the rebalance mechanics openly.
- **Avoid.**
  - Governance vocabulary ("auction launcher", "vote-lock").
  - Institutional tone.

### Bitwise ATPs via Glider
- **Patterns.**
  - Model portfolios (Mag7X, AI Leaders, Robotics) on Coinbase tokenized stocks on Base.
  - Tokens stay in the user's non-custodial wallet while Glider rebalances to the published weights.
  - Fee is 0.15%, for qualified non-US investors [11].
- **Steal.**
  - "Your tokens stay yours". We say it as "withdraw the actual stock tokens anytime".
- **Avoid.**
  - A top-down curator with no creator economy. Also note "AI Leaders" overlaps with Bitwise's own name. **Rename our seed basket** (see OPEN_QUESTIONS).

### Hyperliquid vaults
- **Patterns.**
  - The leader must keep at least 5% of vault equity *(verify; secondary sources)*.
  - Fixed 10% profit share. Lockup is 1 day by default and the leader can extend it.
  - Deposits can be disabled by the leader.
  - The list sorts by APR, TVL, age and leader [12][13].
- **Steal.**
  - Leader equity share as a first-class stat.
  - A sortable leaderboard.
  - Showing "deposits paused" status honestly.
- **Avoid.**
  - Lockups (we have none, so say so).
  - APR-first sorting that rewards lucky short windows.

### pump.fun
- **Patterns.**
  - A launch in seconds.
  - A per-token progress bar to "graduation" and a "King of the Hill" homepage slot [22].
  - Fast social proof.
- **Steal.**
  - **Create-in-one-screen energy**, and a share card right after creating.
  - A progress meter. For Alloy: "$812 of $5,000 cap filled" during the hackathon cap.
- **Avoid.**
  - Casino cues, sniping, and hype tickers. Our audience is new to investing.

### feel.cash
- **Patterns.**
  - "Where stocks meet internet culture".
  - Theme chips (Big tech, AI & chips, Crypto economy, Pre-IPO, Space & defense), a ticker strip, and "trending stock-paired coins" [14].
- **Steal.**
  - Theme chips for Explore.
  - Culture-native tone.
- **Avoid.**
  - Dense tables as the first thing a new investor sees.

### Aave
- **Patterns.**
  - The health factor is a single number with a "Risk details" modal that plots it against the liquidation line [23].
  - The community asked for subscribable alerts and parameter-change disclaimers [23b].
- **Steal.**
  - **One number plus a "what does this mean" modal.**
  - For us, "Drift" would show how far the basket is from its recipe, against the band.
- **Avoid.**
  - Jargon-first labels.

### Pendle
- **Patterns.**
  - Two UIs on the same contracts: a simple "Earn" and an advanced "Trade", switched by a toggle [24].
  - Reviewers still find it hard for beginners [24b].
- **Steal.**
  - **Simple by default, details on demand.**
  - A "Details" toggle on the basket page that reveals bands, contract address and oracle status.
- **Avoid.**
  - Showing the mechanism before the outcome.

### Morpho
- **Patterns.**
  - Vaults are curated by named curators.
  - Listing is "discovery, not endorsement" [25].
  - Pending changes and timelocks are shown in a Risk view [25b].
- **Steal.**
  - **"Pending changes" with a timelock countdown.** This is exactly our 24h notice.
  - A curator profile.
  - "Listing isn't endorsement" phrasing for our creator baskets.
- **Avoid.**
  - Hiding the risk view behind three clicks.

---

## 3. Steal / avoid table (by UX area)

| Area | Steal | From | Avoid | From |
|---|---|---|---|---|
| Onboarding | Passkey account, no seed phrase. Gas sponsored. "Account", not "wallet". | Coinbase Smart Wallet | Asking for a wallet install or bridge before value is shown | Most DeFi |
| Onboarding | Browse before sign-up. Ask for sign-up only at "Buy". | Robinhood, feel.cash | KYC-style forms (we don't need KYC in v2) | old Alloy v1 |
| Explore | Theme chips + story cards | feel.cash, smallcase | Ticker tables first | feel.cash |
| Explore | Sort by AUM / followers / follower return | Hyperliquid | APR / short-window return as the default sort | Hyperliquid |
| Detail page | One hero number + range chips | Robinhood | Day-PnL tinting the whole page | Robinhood |
| Detail page | Follower vs creator PnL, creator stake | Dub (min stake), Hyperliquid | Risk score as the only trust signal | eToro |
| Detail page | Last / next rebalance, managed by | smallcase | Governance console | Reserve |
| Buy / sell | Keypad + presets, single review, hold to confirm | Robinhood | Separate review page users mistake for "done" | Baymard |
| Buy / sell | Show fee in $ per month on your amount | (gap: Dub users ask for it) | Fees only in the FAQ | Dub |
| Rebalance | Pending change + countdown | Morpho | Per-update manual apply | smallcase |
| Rebalance | One-line reason per change | (gap) | Silent risk changes | eToro |
| Trust | Disclosure date on story baskets | Autopilot (lag) | Implied affiliation | Autopilot |
| Trust | "In-kind exit always works" | Bitwise/Glider (self-custody) | Lockups | Hyperliquid |
| Notifications | Rebalance done, recipe change proposed, market reopened | smallcase | "Prices are moving! Trade now" nudges | Robinhood (regulators) |
| Creator tools | Launch in one screen, share card after | pump.fun | Sniping, hype mechanics | pump.fun |
| Creator tools | Creator minimum stake shown publicly | Dub | Paid "premium creator" tiers | Dub |
| Empty states | A suggested basket + $5 start | Robinhood (free stock era) | Blank tables | Most DeFi |
| Mobile | Bottom sheets for trade, sticky Buy bar | Robinhood, Coinbase | Desktop-first modals squeezed onto phones | Reserve, Morpho |

---

## 4. Implications for our users (India, Africa, LATAM, SE Asia)

- **Small tickets.** A $5 minimum is the headline. Show amounts in USD, with an optional local-currency estimate ("≈ ₹420") in grey. Never show the local amount as the price.
- **Mid-range Android phones and patchy data.** Design for 360–390px. Keep charts light (SVG sparklines) and use skeleton loaders. No auto-play video.
- **Many are first-time investors.** Use plain words and add a 6-word "what this means" under every metric. "Drift" becomes "How far from the recipe".
- **The US market runs on a different clock.** NYSE opens at 20:00 IST, 22:30 WAT and 10:30 BRT. Always show "US market opens in 3h 12m" in the user's own time.
- **Trust is earned with proof, not logos.** Use the on-chain address, the creator stake and follower PnL. Never "as seen on" or partner logos.

---

## 5. Citations

1. smallcase help, "How do I rebalance my smallcases": https://intercom.help/smallcase-empty/en/articles/4647155-how-do-i-rebalance-my-smallcases. Upstox, "Are rebalance updates applied automatically?": https://upstox.com/help-center/what-is-rebalancing-are-rebalance-updates-applied-automatically-any-charges-248919
2. Tickertape smallcase listing (managed by / fee based / last + next rebalance): https://www.tickertape.in/smallcase/endurance-paired-strategy-portfolio-SMWAMO_0020/portfolio
3. Wright Research, "Smallcase returns, lock-in and minimum investments": https://wrightresearch.in/blog/understanding-smallcase-returns-lock-in-periods-and-minimum-investments-smallcase-how-to-guides
4. smallcase blog, "What happens if I miss a rebalance update": https://www.smallcase.com/blog/what-happens-if-i-miss-a-rebalance-update/. TradingQnA request for auto-apply: https://tradingqna.com/t/small-case-for-long-term-apply-rebalance-updates-automatically/24826
5. eToro, "Upcoming changes to the CopyTrading experience" (risk score 8+ rule): https://www.etoro.com/blog/from-etoro/announcing-upcoming-changes-copytrading-experience/
6. eToro CopyTrader risk warnings (CSL): https://www.etoro.com/copytrader/risk-warnings/ and how it works: https://www.etoro.com/trading/copytrader/how-it-works/
   - 6b. UK Financial Ombudsman decision DRN-4069307: https://www.financial-ombudsman.org.uk/decision/DRN-4069307.pdf
7. Autopilot App Store listing: https://apps.apple.com/us/app/id1613625799
   - 7b. College Investor review: https://thecollegeinvestor.com/59796/autopilot-review/
   - 7c. WallStreetZen review: https://www.wallstreetzen.com/blog/autopilot-investment-app-review/. InvestmentNews on AUM: https://www.investmentnews.com/fintech/autopilot-surges-to-750m-aum-touts-ria-growth-as-users-copy-pelosi-buffett-trades/260729
8. Dub App Store listing (creator $1,000 minimum): https://apps.apple.com/app/1598920501
   - 8b. FinTech Review, "dub review": https://fintechreview.net/dub-review. TechCrunch: https://techcrunch.com/2025/02/02/dub-the-copy-trading-app-that-has-teens-talking/
9. Reserve Index DTF rebalancing docs: https://reserve-docs.pages.dev/reserve-index/rebalancing/4-0-0
10. Reserve Index DTF overview / governance: https://reserve-1.gitbook.io/docs/core-components/index-dtfs/overview. App: https://app.reserve.org
11. Bitwise newsroom, "Bitwise launches ATPs, powered by Coinbase and Glider": https://bitwiseinvestments.com/newsroom/bitwise-launches-automated-token-portfolios-atps-powered-by-coinbase-and-glider. The Block: https://theblock.co/news/business/2026-08-25-bitwise-launches-automated-tokenized-stock-portfolios-for-mag-7-ai-and-robotics-themes-412706
12. Hyperliquid docs, for vault depositors: https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/for-vault-depositors
13. Hyperliquid vault explainer (eco.com): https://eco.com/support/en/articles/15197987-hyperliquid-vault-strategies-2026-hlp-and-user-vaults-explained. Hyperliquid docs, vault leaders: https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/for-vault-leaders-legacy
14. feel.cash home page (fetched 2026-11-19): https://feel.cash
15. Coinbase blog, "Evolving wallets to bring a billion users onchain": https://www.coinbase.com/blog/evolving-wallets-to-bring-a-billion-users-onchain
16. Eco, "Coinbase Smart Wallet deep dive 2026": https://eco.com/support/en/articles/15254041-coinbase-smart-wallet-deep-dive-2026
17. Built for Mars, Robinhood teardown: https://builtformars.com/company/robinhood
18. AppleVis thread on Robinhood swipe-to-submit: https://applevis.com/forum/ios-ipados/swipe-submit. Robinhood support, Auto-send: https://robinhood.com/us/en/support/articles/auto-send
    - 18b. Tearsheet, "Robinhood says yes to regulators and no to gamification": https://tearsheet.co/member-exclusive/robinhood-says-yes-to-regulators-and-no-to-gamification/
19. Equities India, "smallcase explained": https://equitiesindia.com/learn/wealth-products/smallcase-explained
    - 19b. Baymard, mobile review-order benchmark: https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/review-order
20. The Block, "Coinbase launching tokenized US stocks": https://www.theblock.co/news/markets/2026-06-16-coinbase-launching-tokenized-us-stocks-backed-11-holders-receive-dividends-404978
21. Genfinity, "Coinbase tokenized stocks live on Base": https://genfinity.io/2026/08/25/coinbase-tokenized-stocks-live-on-base
22. DEXTools, "What is bonding progress on launchpads": https://www.dextools.io/tutorials/bonding-progress-meaning-launchpads
23. Cyfrin Updraft, Aave v3 borrow (health factor UI): https://updraft.cyfrin.io/courses/aave-v3/foundation/borrow
    - 23b. Aave governance, liquidation notification proposal: https://governance.aave.com/t/arc-proposal-proposal-to-implement-aave-liquidation-protection-and-notification-system/13861. Parameter-change disclaimer: https://governance.aave.com/t/arc-parameter-change-disclaimer-in-borrow-user-interface/9164
24. Pendle docs, App guide (Earn vs Trade toggle): https://docs.pendle.finance/AppGuide/UsingPendle
    - 24b. Coin Bureau Pendle review: https://coinbureau.com/review/pendle-finance-review
25. Morpho interface listing policy: https://docs.morpho.org/get-started/resources/interface-listing-policy/
    - 25b. Hypernative on Morpho pending changes: https://www.hypernative.io/blog/the-information-layer-how-morpho-makes-non-custodial-vaults-work-at-scale. Morpho vault UX best practices: https://docs.morpho.org/developers/earn/vault-ux/best-practices/

**Gaps to close with hands-on testing.** I have not captured screens of app.reserve.org, Glider, Dub, Autopilot or the Coinbase tokenized-stock trade flow. A 30-minute screen-recording session on each (non-US VPN where needed) would turn the *(verify)* items into facts.
