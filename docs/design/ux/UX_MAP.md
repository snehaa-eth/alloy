# Alloy: UX map (v2, for discussion)

2026-11-19. This is a **map, not a UI**. There are no wireframes here on purpose. It defines who we serve, what they are trying to get done, where things live, how each flow behaves in every state, and what we measure. New wireframes should be drawn from this document.

- Visual companion: [`ux-map.html`](./ux-map.html) has the sitemap and every flow as diagrams.
- Review this version answers: [`REVIEW.md`](./REVIEW.md).
- Inputs: [ARCHITECTURE.md](../../ARCHITECTURE.md), [STAGES.md](../../STAGES.md), [RESEARCH.md](../RESEARCH.md), [COPY.md](../COPY.md), [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md), [wireframes.html](../wireframes.html) (treated as draft 1), [X_PLAN.md](../../marketing/X_PLAN.md), `packages/testnet-env/README.md` (faucet facts).
- Claims marked *(verify)* come from secondary sources or memory. Sources are in §11.

## Changelog

**v2 (2026-11-19, after REVIEW.md; founder: "fix all")**
- **Scope = Dec 4 testnet launch driven by X.** Mainnet is a recorded proof only. Mainnet funding routes (exchange send, on-ramps, P2P) and wrong-network states moved to §12 Deferred.
- **Feeds:** buy and sell do **not** need fresh feeds (router and `issue` read raw balances and pool prices). They work 24/7 including weekends. Only keeper rebalances pause on stale or paused feeds. Added the off-hours **DEX fill vs oracle value** gap (§0, §5.3, §5.9).
- **Contract changes reflected:** a recipe change has its own timing, so a drift trim never delays a due change, and the countdown is the exact `executableAt`. Testnet has **no TVL cap** (mainnet keeps $5k). Buy leftovers: tiny dust is donated to the basket, larger leftovers are refunded as USDC, so there's no unexplained stock dust.
- **Review fixes:** a replaced proposal sends a new notice with a diff and resets everyone's choice. Buy shows "≈ you get" from the real quote (not oracle value) and discloses pool fees and impact as "Cost ≈ $x". "Max" preset removed. Claim is one tap per token (caller-only). "Own companies" copy removed. Share and OG cards are watermarked TEST. One status strip instead of three bars. Fixed 1% slippage on testnet.
- **Cuts:** mainnet funding, most notifications (kept: in-app Activity for everything, email only for recipe-change notices), Studio tab (creator tools now live in Me → Your baskets), Watch, AI suggestions, earnings calculator, mode simulation, single-stock sell, send-out, display currency, "Remind me at open", two-step confirm, corporate-action, sequencer and offline states.
- **Additions:** one testnet host where every X link lands on a basket page, with UTM/`s`/`p` kept through sign-in. **Founding Follower #N / Founding Creator #N** badges plus a follower share card as the **primary** post-buy CTA. An "Open in browser" bar on basket pages inside in-app browsers, and email OTP as the default. Locale number formats (`Intl.NumberFormat`). Marketing hooks: BUILD LOG series and the Caesar-in-VR bust mascot on landing and share cards.
- Kept: word budgets and colour moments (§0.1).

**v1** (earlier 2026-11-19): first full map.

**Contents**
0. [Mechanics](#0-the-product-in-one-breath-the-mechanics-ux-must-respect) · [Core principles](#01-core-ux-principles)
1. [Personas](#1-personas)
2. [Jobs-to-be-done and value moments](#2-jobs-to-be-done-and-value-moments)
3. [Information architecture](#3-information-architecture)
4. [End-to-end journeys](#4-end-to-end-journeys)
5. [Task flows with all states](#5-task-flows-with-all-states)
6. [Notification and trust map](#6-notification-and-trust-map)
7. [Decision log](#7-decision-log)
8. [Critique of wireframes round 1](#8-critique-of-wireframes-round-1)
9. [Success metrics and instrumentation](#9-success-metrics-and-instrumentation)
10. [Open questions for the founder](#10-open-questions-for-the-founder)
11. [Sources](#11-sources)
12. [Deferred after Dec 4](#12-deferred-after-dec-4)

---

## 0. The product in one breath (the mechanics UX must respect)

| Mechanic | What it means for UX |
|---|---|
| A basket is a shared vault; you hold a **basket token** | One line per basket in Portfolio. No per-stock management. Copy: "Your slice: 5 stocks", never "you own companies" (tokenized exposure, not shares). |
| **Buy** = USDC → router swaps into the stocks → basket tokens out. **Sell** = reverse. User sets `minOut`. | Fills are at **pool (DEX) prices**, which include pool fees and price impact. Quotes can move. Slippage failures are possible. |
| Buy and sell need **no fresh price feed** | They work **24/7, weekends included**. Off-hours the pools can drift from the last oracle price, so what you get can differ from the shown **Value**. Warn, never block. |
| **Value** (oracle NAV per token) vs **fill** (DEX quote) | Basket hero shows Value. Buy and Exit show "≈ you get" from the live quote. If they differ by > 0.5%, show an amber chip ("Fills ~0.8% lower now"). |
| Buy leftovers | Tiny dust is donated to the basket. Larger leftovers come back as USDC. Users never see stray stock dust. Success screen shows "Refunded $0.42" when it happens. |
| **Withdraw in-kind** ("Get the stocks"): the actual stock tokens. Can never be paused | The trust anchor, always reachable. |
| **Owed claim**: a policy-blocked token transfer is credited to you; `claimOwed` must be called **by you** | A partial-success state with one-tap, gas-sponsored claim per token. Rare on testnet; built last. |
| **Drift trim**: keeper only, no notice, guarded by feed health and loss caps | Explained after the fact. No user action. **A trim never delays a due recipe change** (separate timing). |
| **Recipe change**: creator proposes with a required reason; **24h notice** (10 min on `demo` baskets); creator can cancel with a reason; a new proposal **replaces** the pending one and **restarts the timer**; the keeper executes at `executableAt` if the market is open and feeds are healthy | The one time we interrupt holders. Default: do nothing = stay in. The countdown is the exact `executableAt`. Replacement = new notice with a diff, choices reset. |
| Strategy modes: Balanced / Let Winners Run / Trend-aware | Fixed per basket. Shown as one chip with an explainer sheet. |
| Fee 1%/yr, minted as basket tokens, 80/20 | No fee charged at buy, but **swap cost (pool fees + impact) is real** and shown as "Cost ≈ $0.03". |
| TVL cap | **Testnet: none.** Mainnet proof: $5k per basket. |
| Testnet: our own test stocks, tUSDC faucet 1,000/address/24h, `dripTo` lets a relayer pay | One tap (or automatic) test money. Labelled "test dollars". |
| Privy embedded account, email OTP, gas sponsored | No seed phrase, no "wallet" words, no gas step. |

---

## 0.1 Core UX principles

**P-1. Say less.** Premium apps feel intuitive because they say less. This is a core principle, not a copy-polish pass.
- One idea per screen or sheet.
- Numbers and visuals beat sentences: a big number, a chart, a donut, a chip, a logo row.
- Progressive disclosure: anything that explains goes behind a tap ("i" tooltip, "See breakdown", a sheet, Details). No paragraphs in flows.
- At most **one short helper line (≤ 8 words) per block**. Labels are 1–3 words. Buttons are verb + number ("Buy $25").
- Legal is one micro line linked to the full text. The exception is the one-sentence US-person attestation.
- If a state needs more than one line, use an icon + number + "Why?" link.
- Numbers use the viewer's locale: `Intl.NumberFormat` with `en-IN` (lakh grouping), `pt-BR` (1.234,56), `id-ID`, etc. USD stays the currency. No text is baked into images.

**Word budgets per screen type** (visible words in the default state, excluding numbers, tickers, nav and the legal micro line):

| Screen / component | Budget | What carries the meaning instead |
|---|---|---|
| Basket card (Explore) | **≤ 12** | Cover colour/art, name, 3 stock logos, two PnL numbers ("Followers" / "Creator"), creator avatar + stake $ |
| Basket page, above the fold | **≤ 25** | Value, chart, range chips, PnL pair, stake chip |
| Basket page section header + helper | ≤ 8 each | Charts, donut/bars for "What's inside" |
| Buy sheet | **≤ 20** | Big amount, keypad, preset chips, logo row with $ per stock, "≈ you get", "Cost ≈ $0.03" chip |
| Exit sheet | ≤ 20 | USDC / Stocks toggle, slider, result number |
| Success screen | ≤ 10 | Check in the basket colour, Founding #, logo row, share card |
| Recipe-change sheet | ≤ 30 | Before→after bars, countdown, quoted reason (the creator's words don't count) |
| Activity item | ≤ 12 | Type icon, before→after chips, $ cost |
| Email (change notice) | ≤ 40 | One button |
| Empty state | ≤ 10 + 1 CTA | Line illustration, one number |
| Create step | ≤ 15 | Live share-card preview, stacked weight bar |
| Error / edge state | ≤ 12 + 1 action | Icon + "Nothing was spent" pattern |
| Landing hero | ≤ 20 | Headline, Caesar-in-VR art, 3 proof numbers |

**P-2. Colour carries meaning and delight; black and white is the frame, not the picture.** The visual team owns the palette. This map only marks *where* colour should do work:

| Moment | Colour job | Where |
|---|---|---|
| Basket identity | Each basket gets an **identity colour + cover art** used on its card, page header, share/OG card, Portfolio row and Activity items | Explore, Basket, Portfolio, share card |
| Stocks | **Real stock logos** (or colour monograms) instead of ticker text, consistent everywhere | Cards, What's inside, Buy logo row, Withdraw table |
| Composition | Donut / stacked bar in stock colours for target vs now | Basket page, Create weights, change before→after |
| Performance | Gain/loss colours on numbers and chart lines only (always with ▲▼); follower vs creator lines in two distinct hues | Charts, PnL pair |
| Success | Short colour moment on buy/create success (the basket colour fills the check); the Founding # badge is the hero; no confetti | Buy, Create |
| Status | One status strip whose colour follows its state (open, closed, change pending, test) | Global |
| Creator | Avatar ring in the creator's colour; "Creator invested" and "Founding Creator #N" badges | Card, profile |
| Mascot | Caesar-in-VR bust on the landing page, share cards and BUILD LOG posts; never inside product flows | Landing, share/OG cards |
| Empty states | One accent colour in the line illustration | Empty states |

---

## 1. Personas

Four personas. The first is the one we design for; the others must not be broken by those choices.

### P1. Asha, first-time investor (primary)
- **Who:** 26, Pune. Product analyst. Earns ~₹90k/month. Has a mutual-fund SIP via Groww and a little Nifty ETF. Has never bought a US stock. Has heard of USDT, never held it.
- **Device and context:** mid-range Android (Redmi/Realme), Chrome, low RAM (tabs get killed on app switch). Good 4G at home, patchy on the commute. Short bursts, mostly evenings (US open is 20:00–02:30 IST). Arrives from X, so she lands in **X's in-app browser**.
- **Money:** On mainnet she'd start with ₹500–₹2,000 ($6–$24). On testnet she uses test dollars.
- **Goals:** Own "the AI story" without picking tickers. Feel smart, not lucky. Something she can explain to a friend.
- **Fears:** Scams. Crypto tax and "is this legal for me?" (India taxes crypto/VDA gains at 30% plus 1% TDS [S11]). Not getting money out. Hidden fees. An influencer dumping on her.
- **Says:** "Who made this basket, and did the people who copied them actually make money?"
- **Implication:** Trust signals must be visible **before** sign-up. On testnet the money step must be one tap and clearly labelled as test dollars.

### P2. Tunde, crypto-native trader
- **Who:** 31, Lagos. Freelance dev paid in stablecoins. Uses Binance P2P, Bybit, Phantom, MetaMask. Trades memecoins on Base.
- **Device:** iPhone + MacBook. Fast, impatient.
- **Goals:** Dollar stock exposure without a US broker. "Can I take the stock tokens out?" Verify contracts.
- **Fears:** Rugs, admin keys, hidden mint/fee logic, lockups, getting stuck in a vault.
- **Says:** "Show me the contract, the oracle, and who can move my funds."
- **Implication:** Simple by default, **Details on demand** (contract, roles, bands, feeds, Value vs fill). Withdraw in-kind front and centre.

### P3. Kavya, creator / finfluencer
- **Who:** 29, Bengaluru (or São Paulo). 40k followers posting market threads on X and Instagram. Monetises a paid Telegram group today.
- **Device:** Phone for posting, laptop for research.
- **Goals:** Turn a thesis into a product in one link. Earn a recurring fee. Look credible. Be one of the first 50 **Founding Creators**.
- **Fears:** Followers losing money and blaming her. Looking like a pump. Regulatory heat (SEBI's finfluencer rules *(verify current scope)*). Backlash from a recipe change.
- **Implication:** Create in one sitting, a share card immediately, a proposal flow that forces a reason, honest follower PnL.

### P4. Jordan, hackathon judge
- **Who:** Base ecosystem reviewer going through 30+ entries in a day, possibly on a weekend.
- **Device:** Laptop, Chrome.
- **Time:** 2–5 minutes per project.
- **Goals:** See the core loop work on-chain. Understand the novel bit fast. Confirm it's on Base.
- **Fears:** Sign-up walls, faucets, gas, broken testnet, a demo that only works in a video.
- **Implication:** A **2-minute judge path** (`/try`) with automatic test money, seeded history and one live demo change. Every receipt links to basescan.

---

## 2. Jobs-to-be-done and value moments

| Persona | Main job | Supporting jobs |
|---|---|---|
| Asha | "When I hear about a big theme, help me put a small amount into it with someone credible, so I don't have to pick stocks." | Know it's legit · see how I'm doing · get out when I want |
| Tunde | "When I hold idle stablecoins, help me hold diversified US stock exposure that I can verify and exit on-chain." | Verify contracts · withdraw the underlying tokens |
| Kavya | "When I have a market thesis, help me package it into something followers can buy and that pays me as it grows." | Launch fast · share well · explain changes · see earnings |
| Jordan | "When I evaluate an entry, help me confirm in two minutes that the core loop works on-chain and is novel." | No setup · proof (tx links) · edge-case handling |

| Persona | Aha moment | Where | Target |
|---|---|---|---|
| Asha | **"Followers made money too, and the creator has real money in it."** | Basket page hero (before sign-up) | < 30 s from landing |
| Asha | **"I'm Founding Follower #212 with a slice of 5 stocks."** | Buy success | First session |
| Asha | **"It rebalanced itself and told me why."** | First trim in Activity | First week |
| Asha | **"I can get out any time, even on a Sunday."** | Exit sheet | First visit to Exit |
| Tunde | "The stock tokens are real tokens I can withdraw." | Details; Get the stocks success | First session |
| Kavya | **"My basket is live, I'm Founding Creator #07, and it has a share card."** | Create success | < 5 min |
| Kavya | "Followers saw my reason and most stayed." | Change executed summary | First recipe change |
| Jordan | **"Buy → change notice → in-kind exit, all on-chain, in 2 minutes."** | `/try` | < 2 min |

---

## 3. Information architecture

### 3.1 Nav model

**Four bottom tabs on mobile, the same four as a top nav on desktop. No Studio tab for Dec 4: creator tools live in Me → Your baskets.**

| Tab | Purpose | Default for |
|---|---|---|
| **Explore** | Discover baskets and creators. Search. Themes. | Logged-out users; signed-in users with no holdings |
| **Portfolio** | Baskets, withdrawn stock tokens, cash (test USDC), held-for-you claims. Pending changes on my baskets. | Signed-in users with any balance |
| **Activity** | In-app inbox: recipe-change notices (Needs you), trims and executed/cancelled changes (Updates), receipts. | Links from change-notice emails |
| **Me** | Profile with Founding badge(s), **Your baskets** (creator tools: overview, propose, pending, cancel, share), Build a basket, Add test money, help, legal, sign out. | — |

- Why not "Create" as a tab (round 1): it gives 25% of the nav to a rare action. Build a basket stays one tap away: landing, Explore header, empty search, Me.
- Why Activity: Alloy's trust story is "we explain changes". The explanations need a home that lasts after an email is read.
- Why no Studio tab yet: few creators before Dec 4; a Me section is enough. Promote it to a tab later (§12).

### 3.2 Global elements
- **One status strip** (top, one line, highest priority wins): recipe change < 24h on a basket you hold → held-for-you claim → market closed (US, local time). Tapping opens a sheet.
- **Test mode**: a thin coloured edge on the frame plus "TEST" on every balance and on share/OG cards. Not a third banner.
- **"Open in browser" bar** when the page runs inside an in-app browser (X, Instagram, Telegram), on every basket page, not just at sign-up.
- **Add test money** sheet, callable from Buy, Portfolio > Cash and Me.

### 3.3 Sitemap

```
One testnet host (e.g. the existing Vercel app)

Landing (logged out, direct visits)  ──►  Explore
X links  ──►  /b/:addr?s=x&p={post}  (basket page; s/p/utm kept through sign-in)
Judges   ──►  /try

├─ Explore
│   ├─ Search (baskets · stocks · creators)
│   ├─ Theme chips · Sort
│   ├─ Basket page  /b/:addr
│   │   ├─ Hero: Value + chart + range
│   │   ├─ Did followers win? (follower vs creator PnL)
│   │   ├─ Skin in the game (creator stake, Founding Creator badge)
│   │   ├─ Pending change card (if any)
│   │   ├─ What's inside (target vs now)
│   │   ├─ Strategy chip → explainer sheet
│   │   ├─ What changed and why (feed)
│   │   ├─ Details (contract, roles, bands, feeds, Value vs fill)
│   │   ├─ [sheet] Buy  ──► [sheet] Add test money (if short)
│   │   ├─ [sheet] Exit: Get USDC | Get the stocks
│   │   ├─ [sheet] Change (keep / sell / get the stocks)
│   │   └─ [sheet] Share (TEST-watermarked card)
│   └─ Creator profile  /c/:addr
├─ Portfolio
│   ├─ Total + since you joined
│   ├─ Baskets → basket page
│   ├─ Stocks (withdrawn; view only, see §12)
│   ├─ Cash (test USDC) · Add test money
│   └─ Held for you → Claim (per token)
├─ Activity
│   ├─ Needs you (open change notices, claims)
│   ├─ Updates (trims, changes executed / cancelled / replaced)
│   └─ Receipts (tx links)
└─ Me
    ├─ Profile + Founding Follower # / Founding Creator #
    ├─ Your baskets (creators): overview · Propose change · Pending (countdown, Cancel with reason) · Share
    ├─ Build a basket → Create flow
    ├─ Add test money
    ├─ Email for change notices
    ├─ Help · How Alloy works · Fees · Legal · Not for US persons
    └─ Sign out

Create flow (full-screen, 5 steps): Idea → Stocks → Weights → Strategy & fee → Seed & launch → Share
/try judge tour
```

### 3.4 What lives where, and why

| Thing | Lives | Why |
|---|---|---|
| Follower vs creator PnL | Basket hero + card | The differentiator; seen before sign-up |
| Creator stake | Basket, card, profile | Skin in the game |
| Pending recipe change | Basket card, card pill, Portfolio badge, Activity, status strip | Nobody buys blind into a change |
| Trims | Basket feed + Activity Updates | No action needed; explainable later |
| Get the stocks | Equal option in the Exit sheet | A feature, not an emergency |
| Held for you | Portfolio + Activity + status strip | Partial success must not be lost |
| Add test money | Inline in Buy, Portfolio, Me | Funding is part of buying |
| Mechanics | Basket Details | Simple by default |
| US-person attestation | First money action | Not at browse |
| Founding # | Buy/Create success, profile, share card | The traction hook (X_PLAN §2) |
| Creator tools | Me → Your baskets | Few creators; no tab yet |

### 3.5 URL scheme
`/` landing · `/explore` · `/b/:addr` basket (SSR + OG image, TEST watermark) · `/b/:addr?buy=25` opens Buy prefilled (buy intent stays in the URL so a killed tab can recover it) · `/b/:addr/change` change sheet (email target) · `/c/:addr` profile · `/portfolio` · `/activity` · `/me` · `/create` · `/try`. **Attribution:** `s`, `p`, `ref` and `utm_*` are stored before sign-in and attached to `auth_success`, `buy_success` and `create_success`.

---

## 4. End-to-end journeys

### 4.1 First-time follower (Asha), testnet

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Discover | Taps a basket link in a BUILD LOG post or a creator's post; opens in X's in-app browser | "Another crypto thing?" | Curious, wary | Slow page; webview limits | SSR basket page, first paint < 2s, ~150KB JS above the fold; "Open in browser" bar |
| 2. Understand | Reads PnL pair, stake, what's inside | "Did people like me make money?" | Reassured if honest | Jargon | Numbers + "i"; ≤ 25 words above the fold |
| 3. Decide | Taps **Buy** | "It's test money, fine" | Playful | "What is this money?" | Button helper: "Free test dollars" |
| 4. Sign up | Email code (default), one-sentence attestation | "Why do they need this?" | Mild friction | App switch to mail can reload the page | Codes not magic links; amount + basket kept in URL |
| 5. Fund | Test dollars added (automatic at sign-up, or one tap) | "Nice, that was it" | Relieved | — | Label: "1,000 test dollars. Not real money." |
| 6. Buy | Preset $25 or $100 → Confirm | "What do I get?" | Tense → relieved | Quote moves; off-hours gap | "≈ you get" from the quote; "Cost ≈ $0.03" |
| 7. Own | Success: **Founding Follower #212** + slice of 5 stocks | "Screenshot this" | Proud | Dead-end success | **Share card is the primary CTA** (TEST watermark, ref link) |
| 8. First trim | Activity: "Trimmed NVDA. Your value unchanged except $0.06." | "Did I need to do something?" | Mild alarm → trust | Unexpected | "No action needed" first |
| 9. Recipe change | Email + Activity: changes in 24h | "Should I leave?" | Uncertain | Pressure | Default keep; "≈ $14 of yours moves"; equal exits |
| 10. Sell | Sells 30%, any day of the week | "Will I get it?" | Relief | Off-hours price gap | Amber chip if fill differs from Value |

### 4.2 Returning follower

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Trigger | Opens from a change-notice email or habit | "How am I doing?" | Neutral | Session expired | Long Privy session; Portfolio is home |
| 2. Check | Portfolio total, since you joined | "Why is it down today?" | Calm or anxious | Day-change anxiety | Since-joined first; day change secondary |
| 3. Catch up | Activity | "What happened?" | Informed | — | Unread dot; "2 updates since Tue" |
| 4. Act | Buy more / sell / decide on a notice | — | Confident | — | "Buy more" with last amount |
| 5. Explore | Other baskets | "What else?" | Curious | Overlap | "You already hold NVDA via The AI Build-Out" |

### 4.3 Creator (Kavya), testnet

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Decide | "Build a basket" from landing, Explore, Me or a "reply with a story" link | "Worth it?" | Curious | Unclear economics | "1% a year · you keep 80%" chip; "Founding Creator spots: 31 of 50" (only if true) |
| 2. Idea | Name, ticker, thesis, story toggle | "Make it sound good" | Creative | Ticker collisions | Live share-card preview |
| 3. Stocks + weights | 2–10 stocks, typed % | "Why only 10?" | Constrained | % maths on a phone | "Split evenly"; stacked bar; warn > 40% |
| 4. Strategy | Mode chip; fee fixed | "What do these do?" | OK | Abstract | One line each; explainer sheet |
| 5. Seed | ≥ $10 test dollars | "How much?" | Committed | — | Same inline faucet; draft never lost on failure |
| 6. Launch | Success: **Founding Creator #07** + share card | "Will anyone follow?" | Excited | — | Share on X is primary; "Propose a change" link for later |
| 7. Grow | Me → Your baskets: AUM, followers, fees | "Working?" | Motivated | Fees are tokens | Fees in $, "paid as basket tokens" behind "i" |
| 8. Propose | New weights, reason, preview, send | "Will they leave?" | Nervous | — | Preview exactly what followers see |
| 9. Replace / cancel | Edits again or cancels with a reason | "I changed my mind" | Embarrassed | Timer restarts | Clear "This restarts the 24h notice" warning |
| 10. Executed | Sees cost and stayed-vs-left | "Did it go well?" | Relief | Waiting for market | "Due · waiting for market open" state |

### 4.4 Judge (Jordan): 2 minutes on Base Sepolia

| t | Step | What they see | Proof |
|---|---|---|---|
| 0:00 | Submission link → `/try` | "Try Alloy with test money. 2 minutes." **Start** | Test edge + TEST on balances |
| 0:10 | Email code (or Privy guest if enabled, *verify*) | 1,000 test dollars added automatically (`dripTo` relayer) | Faucet tx |
| 0:30 | Lands on a **judge demo basket** (from a pool, one per judge): seeded history with ≥ 1 trim, plus an open 10-min demo recipe change | PnL pair, feed, countdown at exact `executableAt` | Contract in Details |
| 0:45 | Buys $100 | Founding # + slice of 5 stocks | Buy tx |
| 1:05 | Opens the pending change | Keep / Sell / Get the stocks | `RecipeProposed` tx |
| 1:20 | Get the stocks, 30% | 5 tokens in Portfolio > Stocks | Withdraw tx |
| 1:40 | (Optional) watches the change execute when the timer ends (market hours) or sees "Due · waiting for market open" | Feed item with cost | `Rebalanced` tx |
| 2:00 | End card: the on-chain actions with links + "Build your own" + repo | — | All tx links |

Edge cases: faucet already used today → we top up via the relayer (we control tUSDC); weekend → buy, sell and Get the stocks all work, the demo change shows "Due · waiting for market open" (honest, and itself a demo of the guard); RPC slow → pending state, no double submit. **The Demo lab with "move NVDA +20%" is cut**: it moved shared feeds for everyone and read as oracle control. Seeded history replaces it.

---

## 5. Task flows with all states

Diagrams for each are in `ux-map.html`.

### 5.1 Sign-up / login

**Trigger:** first money action (Buy, Create, Add test money) or "Sign in". Never on first open.

**Happy path:** Buy → [Make an account: **email code (default)** · Google (hidden in in-app browsers) · passkey] → code → [one sentence: "I'm not a US person, and this is allowed where I live."] → test dollars added automatically → back to the action with amount and basket kept (URL + stored attribution).

| State | Behaviour |
|---|---|
| In-app browser (X, IG, Telegram) | "Open in browser" bar on the page; Google hidden (OAuth is blocked in webviews [B3]); email code works in place |
| App switch to read the code reloads the page | Intent restored from URL (`?buy=25`); attribution from storage; code field re-shown |
| Code wrong / expired | Inline; resend after 30s |
| Phone login chosen, SMS slow (India DND/DLT) | After 45s offer email; email is default for IN locales |
| Attestation declined | Browse only |
| Session expired mid-flow | Re-auth sheet, then resume |
| Privy outage | "Sign-in is down. Browsing still works." |

### 5.2 Funding (testnet only for Dec 4)

**Default:** test dollars are dripped automatically at first sign-in (relayer `dripTo`). **Elsewhere:** "Add test money" → **Get 1,000 test dollars** → ~2–5s → balance updated → back to the action.

| State | Behaviour |
|---|---|
| Already claimed today | "Next refill in 7h 12m." If balance < $5, relayer top-up (we mint tUSDC) |
| Faucet daily cap (`maxDripsPerDay`) | Raise before launch; ops alert; message "Test money is out for today" |
| Relayer down | Error + retry; ops alert |
| Label | Always "test dollars · not real money" at the drip and on balances |

Mainnet funding (exchange send, on-ramps, P2P, wrong-network recovery) is **deferred** (§12). The research behind it stays in §11 [S1–S12] for later.

### 5.3 Buy

**Happy path:** [Buy sheet: amount keypad, presets **$10 · $25 · $100** (no "Max"), balance, logo row with $ per stock, **"≈ you get" from the live quote**, chips "Fee 1%/yr" and "**Cost ≈ $0.03**" (pool fees + impact)] → **Buy $25** (tap) → [Buying… ~5s] → [Success: **Founding Follower #N** (first buy only) + "Your slice: 5 stocks" + $ per stock + "Refunded $0.42" if any + **Share** (primary) + Done].

Under the hood: quote → simulate → exact approve/permit → `router.buy(minOuts, minShares)` with fixed 1% slippage on testnet → receipt → invalidate. Tiny leftovers are donated to the basket; larger leftovers are refunded as USDC.

| State | Behaviour |
|---|---|
| Not signed in | 5.1, then back with amount |
| Below $5 | "Minimum $5" |
| Short balance | "Add test money" inline → back |
| Quote stale (> 15s) | Auto-refresh; never move the number under the user's finger |
| Fill vs Value gap > 0.5% (common off-hours) | Amber chip "Fills ~0.8% lower now" (or higher); "Why?" sheet: "US market closed; pools move on their own" |
| Market closed / weekend | **Allowed.** Status strip shows closed; gap chip only when the gap is real |
| Pending recipe change on this basket | Inline chip "Changes in 14h" → Change sheet. Not a block |
| Demo basket (10-min notice) | "Demo" badge |
| Mainnet proof only: cap reached / partial room | "Full ($5k limit)" / clamp to room left. Not on testnet |
| Global pause (issue paused) | "New buys paused. Selling and Get the stocks still work." |
| Simulate reverts with `PolicyForbids` | "One stock can't be bought right now." Nothing sent |
| Slippage revert | "Nothing spent." Try again |
| Pending > 30s / unknown | Leave allowed; poll by tx hash; no second submit |
| Generic fail | "Your USDC is still there." |
| First-buy success | Founding #, share card primary; notification ask is cut |

### 5.4 Exit → Get USDC (sell %)

Exit sheet: segmented **Get USDC** (default) | **Get the stocks**. Slider 25/50/75/All → "≈ $37.92" from the quote · "You keep $88.48" · "Cost ≈ $0.05" → **Sell 30%** → success "$37.88 USDC added".

| State | Behaviour |
|---|---|
| Any day, any hour | Works (no fresh feed needed) |
| Fill vs Value gap > 0.5% | Amber chip; suggest Get the stocks (no price impact) |
| Impact > 1% | Warn; suggest smaller or Get the stocks |
| Dust left (< $0.50) | Suggest All |
| Slippage revert | "Nothing sold." |
| Pending change | Countdown in the sheet header |
| Global pause | Never affects selling |

### 5.5 Exit → Get the stocks (withdraw in-kind)

Slider → logo table of tokens with ≈ $ → chip "Won't rebalance" → **Get the stocks** → "5 stock tokens in Portfolio > Stocks".

| State | Behaviour |
|---|---|
| Any market state, any pause | Always works |
| One token's transfer blocked | "4 of 5 came through. AMZNc is held for you." → 5.6 |
| After withdrawal | Portfolio > Stocks is **view-only** for Dec 4 (single-stock sell and send-out deferred). Say so: "To sell these, use a Base DEX. In-app selling is coming." |

### 5.6 Claim ("Held for you")

Banner + Activity + Portfolio row → Claim sheet (token, amount, ≈ $) → **Claim** (gas-sponsored; must be signed by the user because `claimOwed` is caller-only) → moved to Stocks, or "Still can't send; kept for you, no expiry". Several tokens = one tap each (no "Claim all" batch). Rare on testnet; build last.

### 5.7 Recipe-change notice and window (follower)

**Trigger:** `RecipeProposed` on a basket the user holds.

→ email + Activity "Needs you" + status strip + Portfolio badge → [Change sheet: before→after bars, quoted reason, "**≈ $14 of yours moves**", "Cost ≈ $6 for the basket", **countdown to the exact `executableAt`** in local time] → Keep (or do nothing) · Sell · Get the stocks.

| State | Behaviour |
|---|---|
| Keep chosen | Marked "You're staying" |
| **Replaced** (creator proposes again) | New email + Activity item "@kavya updated the change" with a **diff vs the previous version**; the timer restarts at the new `executableAt`; **every follower's choice resets** (a Keep on version A doesn't carry to B); the feed logs the replacement |
| Cancelled | "Cancelled: '{reason}'. Nothing changes." |
| Due, market open, feeds healthy | Keeper executes at `executableAt`. **A trim never delays it** (separate timing) |
| Due, market closed or feed stale/paused | "Due · runs at market open" (or "when prices are healthy"). Exits stay open |
| Executed over several days (large change, loss caps) | "Changing · day 1 of 2" |
| Executed | "Done. Cost $6.10. Your $126 is on the new recipe." |
| User already exited | "You left before the change." No more emails |
| Demo basket | Minutes countdown; "Demo" badge |

The T−2h reminder is cut (§12).

### 5.8 Drift trim

**Trigger:** keeper `Rebalanced` with no pending change.
→ Activity "Updates" only (no email) → "Trimmed NVDA 41→40%. Your value unchanged except $0.06 cost." → "Why?" → mode explainer.

| State | Behaviour |
|---|---|
| Deferred (market closed, feed stale/paused, loss budget) | Basket Details: "Rebalance waiting: {reason}". No notification |
| Partial (chunked) | "Trimmed part way. More tomorrow." |
| Let Winners Run | Feed: "Only trims above 40%" |
| A recipe change is due | Trim timing never blocks the change |

### 5.9 Market and feed conditions

| Condition | Buy | Sell | Get the stocks | Rebalance (trim or recipe) | User sees |
|---|---|---|---|---|---|
| US market open, feeds healthy | Yes | Yes | Yes | Yes | Strip hidden or "Open" |
| Market closed (nights, **weekends**, holidays) | **Yes** | **Yes** | Yes | Waits | Strip "Closed · opens 8:00 PM"; amber gap chip in Buy/Exit if fill differs from Value by > 0.5%; chart flat-dashed since close |
| Feed stale (> 25h) or paused | **Yes** | **Yes** | Yes | Blocked | Details: "Rebalances paused: AMZN price source"; due change shows "waiting for healthy prices" |
| Global pause (admin) | No | Yes | Yes | No | Strip "New buys paused" |

Corporate-action, sequencer and offline states are deferred (§12). On testnet the price bot keeps mock feeds fresh (12h heartbeat), so weekends only differ by the market-closed rule.

### 5.10 Policy-blocked transfer (B20 `PolicyForbids`)
- On simulate: name the token, send nothing.
- On Get the stocks: never blocks; partial → held for you (5.6).
- Copy: "held for you" or "can't be sent right now", never "failed" or "frozen".

### 5.11 Failed transaction / slippage (all writes)
1. Simulate first.
2. On revert: what happened, "nothing was spent" (if true), one fix.
3. Slippage is **fixed at 1% on testnet**, not editable.
4. Pending > 30s: leaving is fine; the receipt lands in Activity.
5. Unknown outcome: poll by hash; never invite a second submit.

### 5.12 TVL cap
**Testnet: no cap.** Mainnet proof: $5k per basket → "Full" badge and Buy disabled; partial room clamps the amount (computed on Value, which is what the contract checks). Watch/waitlist deferred.

### 5.13 Creator flows (in Me → Your baskets)

**Create** (5 steps; back never loses input; draft autosaved and **kept if the seed tx fails**):
1. Idea: name, ticker (uniqueness check needs an API: or accept duplicates and show the address), thesis 280, story toggle → source + date required.
2. Stocks: 2–10.
3. Weights: typed %, Split evenly, total 100, warn > 40%.
4. Strategy chip; fee "1%/yr · you keep 80%"; demo flag visible on testnet ("10-min notice, shown as Demo").
5. Seed ≥ $10 test dollars (inline faucet) → **Create basket**.
→ Success: **Founding Creator #N** (first 50) + share card (TEST watermark) + **Share on X** (primary) + "Go to basket" + "Propose a change later" link.

**Propose** (Me → Your baskets → basket): New weights → reason (required, ≤ 140) → preview of what followers see (countdown, "≈ cost") → **Send 24h notice** → Pending card (countdown to `executableAt`) with **Cancel** (reason required) and **Edit** (warning: "This restarts the 24h notice and resets followers' choices").

| State | Behaviour |
|---|---|
| Change too large for one run | "May take 2–3 days at current liquidity" |
| Due but waiting | "Due · runs at market open" |
| Executed | Cost + "92% of followers stayed" |

AI suggestions, earnings calculator and mode simulation are deferred.

### 5.14 Empty states and first run

| Context | State |
|---|---|
| First open from X | Basket page (not landing), "Open in browser" bar if in-app |
| First open direct | Landing → Explore. No carousel |
| Signed in, holds nothing | Portfolio: "Start with $25 of test money." [Explore] |
| Has cash only | "$1,000 test dollars ready." [Explore] |
| No activity | "Changes to your baskets show up here." |
| Basket with 0 followers | Hide follower PnL; show creator stake + "Be Founding Follower #N" if spots remain |
| Basket < 7 days old | "New · 5 days of history" |
| Search no results | "Build '{q}'" |
| Me → Your baskets, none | "Build a basket. Founding Creator spots: 31 of 50" (only if true) |

---

## 6. Notification and trust map

**Dec 4 channels: in-app Activity for everything; email only for recipe-change notices.** Push, Telegram, digests and creator emails are deferred. Email needs a provider (open question) and phone-only users get in-app only.

| # | Trigger | Who | Channel | Timing | Message |
|---|---|---|---|---|---|
| N1 | `RecipeProposed` | Holders | **Email** + Activity (Needs you) | Immediately | "{Basket} changes in 24h. @kavya: '{reason}'. Stay in or leave first." |
| N1r | Proposal replaced | Holders | **Email** + Activity | Immediately | "@kavya updated the change. New time: {local time}. See what's different." |
| N3 | `RecipeCancelled` | Holders | **Email** (if N1 was sent) + Activity | Immediately | "@kavya cancelled the change: '{reason}'." |
| N4 | Change executed | Holders | Activity | On event | "{Basket} is on its new recipe. Cost $6.10." |
| N5 | Change due, waiting | Holders | Activity | When due | "Runs at market open." |
| N6 | Trim | Holders | Activity | On event | "Trimmed NVDA 41→40%. ≈ $0.06 for you." |
| N8 | Held for you | User | Activity + status strip | On event | "AMZNc is held for you. Claim." |
| N9 | Tx receipts | User | Activity | On receipt | — |
| N10 | Creator: change executed | Creator | Activity | On event | "Your change ran. 92% stayed." |

**Never send:** price nudges, "others are buying", streaks, rank changes, confetti.

**Trust surfaces**

| Fear | Surface | Where |
|---|---|---|
| "Leaders win, followers lose" | Follower vs creator PnL | Basket hero, card |
| "Creator will dump" | Creator stake (and sells in the feed) | Basket, card |
| "I can't get out" | Exit always on, 24/7; Get the stocks even when paused | Basket, landing |
| "They'll change it behind my back" | 24h notice, reason, diff on replace, cancel reason, permanent feed | Feed, Activity, email |
| "Hidden fees" | "Cost ≈ $x" on every buy/sell; trim cost for you | Buy, Exit, feed |
| "Price looks wrong at night" | Value vs fill chip with "Why?" | Buy, Exit |
| "Is this real / on-chain?" | Contract, roles, tx links | Details, receipts |
| "Is this real money?" | TEST on balances, share and OG cards | Everywhere on testnet |

---

## 7. Decision log

| # | Decision | Options | Recommendation | Rationale |
|---|---|---|---|---|
| D1 | When to ask for sign-up | On open / at first money action | **First money action** | Trust signals first |
| D2 | Primary nav | Explore/Portfolio/Create/Me · Explore/Portfolio/Activity/Me | **Explore · Portfolio · Activity · Me**; creator tools in Me | Activity holds "explain, don't ask"; creators are few before Dec 4 |
| D3 | Funding inside Buy | Separate / inline | **Inline, return with amount** | Keeps intent alive |
| D4 | Funding scope Dec 4 | Mainnet routes / testnet only | **Testnet faucet only** | Mainnet is a recorded proof |
| D5 | Test money | Manual drip / auto at sign-in | **Auto at sign-in**, button elsewhere | 2 fewer taps; no Sepolia ETH |
| D6 | Confirm gesture | Hold / tap / swipe / two-step | **Tap with amount in the button**, no two-step | The sheet is the review; long-press conflicts with mobile-web selection |
| D7 | Exit UX | Two sheets / one Exit sheet | **One Exit sheet: Get USDC · Get the stocks** | Equal footing for in-kind (cf. eToro Close all / Keep all [S17]) |
| D8 | Recipe-change response | Must acknowledge / do nothing = stay | **Do nothing = stay**; choices reset on replace | No smallcase chore [R1]; no silent carry-over |
| D9 | Hosts | Several entry points / one testnet host | **One testnet host**; X links → `/b/:addr`; `/try` for judges | Fewer front doors, clean attribution |
| D10 | Price shown | Oracle only / quote only / both | **Value (oracle) in hero; "≈ you get" from the quote in sheets; gap chip > 0.5%** | Honest off-hours |
| D11 | Fees shown | "No fee today" / cost shown | **"Cost ≈ $x"** next to the 1%/yr chip | Pool fees + impact are real |
| D12 | Presets | $5/$25/$100/Max | **$10 · $25 · $100**, no Max | Max empties test balances into one basket and isn't safe |
| D13 | Default home | Explore vs Portfolio | **Portfolio if any balance** | Returning users |
| D14 | Performance framing | Day vs since joined | **Since you joined** | Long-hold product |
| D15 | Notifications | Many channels / minimal | **In-app + email for change notices only** | Scope; only the 24h window is time-critical |
| D16 | Traction hook | Notifications ask / share | **Founding # + share card as primary success CTA** | X_PLAN §2; screenshotable |
| D17 | In-app browsers | Ignore / Open-in-browser bar + email code | **Bar on basket pages + email code default** | Webviews block Google OAuth [B3] |
| D18 | Market-closed trading | Block / warn | **Allow; warn only on a real gap** | Buy/sell need no fresh feeds |
| D19 | Text density | Inline / progressive | **Word budgets (§0.1)** | Founder feedback |
| D20 | Basket identity | Text cards / colour + cover + logos | **Colour + cover + logos** | Founder feedback; "stories, not symbols" |
| D21 | Judge demo | Shared Demo lab / per-judge seeded basket | **Pool of demo baskets with seeded history + one live 10-min change** | No shared-feed manipulation; honest |
| D22 | Testnet labelling | Ribbon / edge + TEST marks | **Thin edge + TEST on balances, share and OG cards** | One status strip at 360px; screenshots stay honest |

---

## 8. Critique of wireframes round 1

### 8.1 By section

| Wireframe section | Keep | Change | Flow |
|---|---|---|---|
| 1 Landing | Story-first headline; follower-first live cards; plain legal | Caesar-in-VR bust as the recurring mascot (lazy-loaded); 3 proof numbers; live basket cards; "Founding Creator spots: N of 50" only if real; email capture for non-testers | 4.1 |
| 2 Sign-up | At first Buy; no "wallet"; attestation never pre-ticked | Email code first; Google hidden in webviews; one-sentence attestation; auto test dollars instead of the generic Add money sheet | 5.1, 5.2 |
| 3 Explore | Theme chips; follower-first card; stake; pending pill | Card to ≤ 12 words; logos instead of ticker text; pick one default sort (OQ #3 says Most followed) | §0.1 |
| 4 Basket detail | Order; Details toggle | "Value" not "price"; pending-change card near top; Exit entry; Open-in-browser bar | 5.3–5.7 |
| 5 Buy | Keypad, presets, collapsed breakdown | Tap not hold; no Max; "≈ you get" from quote; "Cost ≈ $x"; gap chip; Founding # + share as success | 5.3 |
| 6 Sell | Slider with stops; "you keep" | Merge into the Exit sheet; gap chip | 5.4 |
| 7 Withdraw | "Take your stocks out" as a feature; held-for-you | Rename "Get the stocks"; Stocks tab view-only with honest note | 5.5 |
| 8 Recipe change + feed | Countdown, three equal choices, cost | Exact `executableAt`; "≈ $14 of yours"; replaced/diff state; due-waiting; multi-day | 5.7 |
| 9 Create | One thing per screen; story toggle; share card | Sign-in at step 5; draft survives failure; Founding Creator #; TEST watermark | 5.13 |
| 10 Creator dashboard | Reason required; preview | Becomes Me → Your baskets; no AI cards; Edit = restart warning | 5.13 |
| 11 Portfolio | Baskets/Stocks/Cash | Add Held for you; Stocks view-only; no display currency | 5.5, 5.6 |
| 12 Market closed | Honest, amber, local time | Buy/sell 24/7 incl. weekends; gap chip only when real | 5.9 |
| 13 Empty states | One step + one number | Testnet first-run, Founding spots | 5.14 |
| Missing | — | Activity, `/try`, held-for-you claim, replaced proposal, Founding #, Open-in-browser bar | 3, 4.4, 5 |

### 8.2 Text-heavy places in round 1 and what replaces them (P-1)

| Where (round 1) | Problem | Replace with |
|---|---|---|
| Landing: subhead + 3-step "How it works" + 4-item "No black boxes" + creator paragraphs | ~150 words before any product | Headline + 3 proof numbers ($5 · 24h · anytime) + live basket cards. "How it works" = 3 icons with 2-word labels; trust items = 4 icon chips that open a sheet |
| Landing legal paragraph | Block | One micro line + "Legal" link |
| Sign-up 2a body + micro line | Two sentences | Title + method buttons; "No seed phrase" chip |
| Sign-up 2b attestation | Long sentence + checkbox sentence | One sentence; "Why we ask" link |
| Add money 2c | A sentence per route + USDC explainer | Gone for Dec 4: auto test dollars with a one-line label |
| Explore card | Thesis + holdings text + stats text + creator line + badges (≈ 25–30 words) | Cover colour, name, 3 logos, two numbers, avatar + "$1.2k in". Thesis moves to the basket page |
| Explore story disclosure | Full sentence on the card | "Story" chip; date + "not affiliated" on tap and on the basket page |
| Basket detail: PnL caption, tooltip, stake sentence, stat helpers, inside helper, strategy line | A sentence per block | Numbers + labels; one "i" per block; strategy chip; stake chip "$1.2k in · 28%" |
| Feed items | 3 lines each | Icon + before→after chips + $ cost; reason only for recipe changes |
| Buy sheet | Balance line + micro legal + inside-the-basket text | Amount, presets, logo row with $, "≈ you get", "Cost ≈ $x" chip; rest under "See breakdown" |
| Buy failure copy | Sentences | Icon + "Nothing spent" + one action |
| Sell sheet | Four text lines | Slider + result number + "You keep $88" chip; gap chip; segmented control replaces the link |
| Withdraw | Body + note | "Get the stocks" + logo table + "Won't rebalance" chip |
| Recipe-change sheet | ~60 words | Countdown + before→after bars + "≈ $14 of yours moves" + 3 buttons; timing rule behind "i" |
| Create helpers | Text per step | Live share-card preview, weight bar, "1%/yr · you keep 80%" chip; "i" for the rest |
| Creator dashboard | Fee helper, AI "Why" paragraph | Numbers + sparkline; AI cut |
| Portfolio helpers | Sentences | Chips: "Not rebalanced", "Held for you · Claim" |
| Market-closed copy | Repeated on many screens | One status strip; tap for a sheet |

### 8.3 Too much black and white (P-2)
Round 1 is greyscale with burgundy only for primary actions. That reads austere on product screens. For the visual team: basket identity colours and cover art (biggest single change), stock logos wherever tickers appear, composition donut/bars in stock colours, two-hue follower vs creator lines, a colour moment and the Founding # on success, the Caesar mascot on share cards. Keep gain/loss/amber reserved for meaning.

### 8.4 Share cards and marketing hooks
- **Follower share card** (primary post-buy CTA): basket cover colour, name, 3 logos, "Founding Follower #212", **TEST** watermark, link `/b/:addr?ref={user}&s=x`.
- **Creator launch card**: name, recipe bar, stake, "Founding Creator #07", Caesar-in-VR bust as a small recurring mark, TEST watermark.
- **BUILD LOG 01, 02, …** is the faceless build-in-public series (no day counts). Every BUILD LOG post links to a basket page, not the landing. The bust is the recurring visual; it never appears inside product flows.
- "Reply with a story" → a prefilled `/create?name=…` link.
- A live counter on landing ("214 baskets bought today") only if true.

---

## 9. Success metrics and instrumentation

### 9.1 North star and activation
- **Activation:** signed-in user makes a first buy within the first session (testnet).
- **North star (Dec 4):** distinct addresses holding a basket token; Founding Followers claimed (of 500) and Founding Creators (of 50).
- **Creator activation:** a created basket gets ≥ 1 non-creator buyer within 7 days.
- **Virality:** share-card taps per buy; buys attributed to `ref` links.

### 9.2 Per-flow metrics

| Flow | Primary metric | Initial target | Drop-off points |
|---|---|---|---|
| X → basket page | Basket views per X click (by `p`); PnL card seen | > 60% see PnL | Webview load; slow SSR |
| In-app browser | "Open in browser" taps; sign-in success in vs out of webview | — | Google in webview; reload after app switch |
| Sign-up | Buy tap → signed in | > 70% | Code not received; attestation |
| Test money | Signed in → dripped | > 95%, < 10s | Relayer, cap |
| Buy | Sheet open → success | > 80% | Quote stale; slippage; confirm abandon |
| Time to first buy | Landing → first buy | < 3 min median | — |
| Share | Success → share tap | > 25% | Share secondary or ugly |
| Recipe change | Email open; keep/sell/stocks split | Opened > 50% | Panic exits |
| Exit | Open → success; in-kind share | — | Off-hours gap |
| Create | Start → live; median time | > 50%; < 5 min | Weights; seed |
| Judge `/try` | Start → end card; duration | > 80%; < 2:30 | Faucet, RPC |

### 9.3 Events (proposed names)

`landing_view`, `basket_view{basket, source, s, p, ref, in_app_browser}`, `open_in_browser_tap`, `pnl_card_seen`, `details_opened`, `buy_tap`, `auth_start{method, in_app_browser}`, `auth_code_sent`, `auth_success{s, p, ref, utm}`, `attest_accepted|declined`, `faucet_auto|request|success|fail{reason}`, `buy_sheet_open`, `quote_received{impact_bps, gap_bps, market_open}`, `buy_confirm{preset}`, `tx_submitted{kind}`, `tx_success|revert{kind, reason}`, `buy_refund{usd}`, `founding_assigned{kind, n}`, `share_tap{target, kind}`, `exit_open{mode}`, `sell_confirm{pct}`, `withdraw_confirm{pct}`, `owed_credited`, `claim_success|fail`, `notice_open{source}`, `notice_choice{keep|sell|withdraw, version}`, `notice_replaced_seen`, `trim_explainer_open`, `create_step{n}`, `create_success{s, p}`, `propose_sent`, `propose_replaced`, `propose_cancelled`, `try_start`, `try_step{n}`, `try_complete`.

Properties on every event: environment, market_open, coarse country, locale, device class, logged_in, has_balance. Join with Ponder on address for funnel truth; hash addresses and emails in analytics.

---

## 10. Open questions for the founder

Prioritised. Each has a recommendation so "yes" is enough.

1. **Email for change notices:** which provider (Resend / Postmark / SendGrid), and phone-only users? **Rec:** Resend; phone-only users get in-app only plus a "Add email for change notices" prompt on first buy.
2. **Founding # badges: on-chain or off-chain?** **Rec:** off-chain, ordered by Ponder (first `Bought` per address; first `BasketCreated` per creator), shown on profile and cards. Cosmetic only, no token or airdrop (X_PLAN §2).
3. **Privy guest login for `/try`?** **Rec:** enable it if available, so judges skip the email code; otherwise email code.
4. **Judge demo-basket pool:** how many, and who resets them? **Rec:** ~20 baskets with seeded history and a 10-min demo change re-proposed by a script every hour; hand them out round-robin.
5. **Default Explore sort:** Most followed (OQ #3) vs Best for followers (round 1). **Rec:** Most followed until there are 20+ baskets with 30+ days.
6. **Ticker uniqueness:** enforce via API or allow duplicates? **Rec:** allow duplicates, show creator + short address; block exact name+ticker duplicates from the same creator.
7. **Stocks tab after Get the stocks** is view-only for Dec 4. OK to ship with "use a Base DEX" note? **Rec:** yes.
8. **India legal/tax posture:** **Rec:** a neutral Help article; no in-flow claims; lawyer before mainnet marketing in India.

Resolved by the lead/contracts (2026-11-19): buy/sell need no fresh feeds; recipe timing is independent of trims; testnet has no cap; leftover dust is donated or refunded; replacements restart the timer; `claimOwed` is caller-only; Dec 4 public app is testnet-only.

---

## 11. Sources

Prior research is cited as [R#] → [RESEARCH.md §5](../RESEARCH.md#5-citations). Review sources [B#] → [REVIEW.md](./REVIEW.md).

- [S1] Coinbase Onramp FAQ: https://docs.cdp.coinbase.com/onramp/additional-resources/faq
- [S2] Coinbase Onramp countries and payment methods: https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/countries-&-currencies · https://docs.cdp.coinbase.com/onramp/additional-resources/payment-methods
- [S3] Transak KYC levels: https://docs.transak.com/guides/transak-different-kyc-levels
- [S4] Transak India / UPI: https://yourstory.com/the-decrypting-story/transak-india-crypto-payment-gateway-fiat-on-ramp
- [S5] Privy account funding: https://docs.privy.io/recipes/account-funding/overview
- [S6] MoonPay country coverage: https://dev.moonpay.com/docs/country-coverage · https://support.moonpay.com/customers/docs/moonpays-supported-countries
- [S7] MoonPay payment methods: https://support.moonpay.com/customers/docs/all-supported-payment-methods
- [S8] Onramper: https://www.onramper.com/country-coverage/NG · https://www.onramper.com/blog/unlocking-high-conversions
- [S9] Coinbase reopens India: https://www.theblock.co/news/business/2025-12-07-coinbase-resumes-user-onboarding-india-381644
- [S10] Coinbase India IMPS rails: https://coin360.com/news/coinbase-india-direct-inr-rails
- [S11] India crypto tax 30% + 1% TDS (reported in https://coinmarketcap.com/academy/article/coinbase-reopens-india-app-after-two-year-regulatory-break) *(verify)*
- [S12] Nigeria P2P (secondary, low quality): https://thecondia.com/buy-stablecoins-safely-nigeria/ *(verify)*
- [S13] Push permission priming: https://doc.batch.com/guides-and-best-practices/orchestration/how-to-improve-the-push-opt-in-rate
- [S14] Push in India: https://business.adobe.com/blog/the-latest/mobile-push-impressions-in-india-the-opportunity-ahead
- [S15] smallcase onboarding: https://www.smallcase.com/learn/how-to-invest-in-smallcase/
- [S16] Funding-step drop-off (vendor data): https://www.pedowitzgroup.com/what-causes-high-abandonment-at-the-funding-step-and-how-to-reduce-it · https://formo.so/blog/defi-onboarding-first-activation
- [S17] eToro stop copy: https://www.etoro.com/copytrader/how-it-works/ · https://goodmoneyguide.com/news/etoro-stop-copy-keep/

---

## 12. Deferred after Dec 4

| Item | Why deferred | Notes for later |
|---|---|---|
| Mainnet funding: send from exchange (USDC on Base), on-ramp aggregator (UPI/IMPS, PIX, QRIS), P2P guidance, wrong-network recovery | Mainnet is a recorded proof | Research in [S1–S12]: coverage for India/Nigeria is patchy and contested; send-from-exchange first |
| Push, Telegram, digests, T−2h reminder, creator emails, creator-sold alerts | Scope | Ask push permission after first buy with a pre-prompt [S13] |
| Studio tab | Few creators | Promote from Me when creators > ~50 |
| Watch / waitlist for full baskets | No cap on testnet | Needed with mainnet caps |
| AI suggestions, earnings calculator, mode simulation | Scope | Keep the "AI-suggested" label rule |
| Single-stock sell, send-out of withdrawn tokens | Scope | Stocks tab is view-only until then |
| Display currency (≈ ₹) | Scope | Locale number formats ship now |
| "Remind me at open" | Scope | — |
| Corporate-action, sequencer-down, offline states | Rare on testnet | Spec in v1 of this map |
| Two-step confirm for large amounts | Test money | Revisit on mainnet |
| External wallet connect | Embedded only | — |
