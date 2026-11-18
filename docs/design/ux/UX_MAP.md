# Alloy: UX map (v1, for discussion)

2026-11-19. This is a **map, not a UI**. There are no wireframes here on purpose. It defines who we serve, what they are trying to get done, where things live, how each flow behaves in every state, and what we measure. New wireframes should be drawn from this document.

- Visual companion: [`ux-map.html`](./ux-map.html) has the sitemap and every flow as diagrams.
- Inputs: [ARCHITECTURE.md](../../ARCHITECTURE.md), [STAGES.md](../../STAGES.md), [RESEARCH.md](../RESEARCH.md), [COPY.md](../COPY.md), [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md), [wireframes.html](../wireframes.html) (treated as draft 1), `packages/testnet-env/README.md` (faucet facts).
- Claims marked *(verify)* come from secondary sources or memory. Sources are listed in §11.

**Contents**
0. [Mechanics](#0-the-product-in-one-breath-the-mechanics-ux-must-respect) · [Core UX principles: say less, colour with purpose](#01-core-ux-principles-founder-feedback-2026-11-19)
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

---

## 0. The product in one breath (the mechanics UX must respect)

| Mechanic (ARCHITECTURE) | What it means for UX |
|---|---|
| A basket is a shared vault; you hold a **basket token** | One line per basket in Portfolio. No per-stock management. |
| **Buy** = USDC in → router buys stocks → basket tokens out. **Sell** = reverse. Both at DEX prices, 24/7, with user `minOut` | Quotes can move. Slippage failures are possible. Off-hours prices are wider: warn, don't block. |
| **Withdraw in-kind**: get the actual stock tokens. Can never be paused | This is the trust anchor, not an emergency hatch. Always reachable. |
| **Owed claim**: if a stock token transfer is policy-blocked, it is credited to you to claim later | A partial-success state. Needs a "held for you" home and a claim action. |
| **Drift trim**: executed only by Alloy's keeper, no notice, ≤1/day, guarded by feed health, loss caps and band rules | Explain after the fact. No user action. |
| **Recipe change**: creator proposes with a required reason, **24h notice** (10 min on `demo` baskets), creator can cancel with a reason; executes at/after the time if market and feeds are OK | The one time we interrupt holders. Default is "do nothing = stay in". Exits must be one tap. |
| Strategy modes: Balanced / Let Winners Run / Trend-aware | Fixed per basket. Shown in plain words; followers can't change it. |
| Fee 1%/yr, minted as basket tokens, 80/20 creator/protocol | Never a USDC charge at buy time. Shown as "$ per month on your amount". |
| Market hours / stale or paused feed | Rebalances wait. Buy/sell still work (with warning). Withdraw always works. |
| TVL cap $5k per basket (hackathon) | "Full" state on cards and in Buy. |
| Testnet: our own test stocks, tUSDC faucet 1,000/address/24h (`dripTo` lets a relayer pay gas) | Judges and new users can get money in one tap. Must be labelled as play money everywhere. |
| Privy embedded wallet, email/phone login, gas sponsored | No seed phrase, no "wallet" vocabulary, no gas step. |

---

## 0.1 Core UX principles (founder feedback, 2026-11-19)

**P-1. Say less.** Premium apps feel intuitive because they say less. This is a core principle, not a copy-polish pass.
- One idea per screen or sheet.
- Numbers and visuals beat sentences: a big number, a chart, a donut, a chip, a logo row.
- Progressive disclosure: everything that explains goes behind a tap ("i" tooltip, "See breakdown", a sheet, Details). Flows carry no paragraphs.
- At most **one short helper line (≤ 8 words) per block**. Labels are 1–3 words. Buttons are verb + number ("Buy $25").
- Legal lines are micro text, one line, linked to the full text, never a block in a flow. The exception is the US-person attestation, which must be read.
- If a state needs more than one line to explain, it needs an icon + number + "Why?" link instead.

**Word budgets per screen type** (visible words in the default state, excluding numbers, tickers, nav and legal micro line):

| Screen / component | Budget | What carries the meaning instead |
|---|---|---|
| Basket card (Explore) | **≤ 12** | Cover colour/art, name, 3 stock logos, two PnL numbers with labels "Followers" / "Creator", creator avatar + stake $ |
| Basket page, above the fold | **≤ 25** | Price, chart, range chips, PnL pair, stake chip |
| Basket page section header + helper | ≤ 8 each | Charts, donut/bar for "What's inside" |
| Buy sheet | **≤ 20** | Big amount, keypad, preset chips, logo row with $ per stock, "Fee $0.004/mo" chip |
| Exit sheet | ≤ 20 | Segmented control "USDC / Stocks", slider, result number |
| Success screen | ≤ 10 | Check animation, amount, logo row |
| Change (recipe) sheet | ≤ 30 | Before→after bars, countdown, quoted reason (creator's words don't count) |
| Activity item | ≤ 12 | Icon by type, before→after chips, $ cost |
| Notification (push) | ≤ 15 | — |
| Add money route row | ≤ 6 | Provider/exchange logos, method chips (UPI, PIX, QRIS) |
| Empty state | ≤ 10 + 1 CTA | Line illustration, one number |
| Create step | ≤ 15 | Live share-card preview, stacked weight bar |
| Error / edge state | ≤ 12 + 1 action | Icon + "Nothing was spent" pattern |
| Landing hero | ≤ 20 | Headline, art, 3 proof numbers |

**P-2. Colour carries meaning and delight; black/white is the frame, not the picture.** The visual team owns the palette. This map only marks *where* colour should do work:

| Moment | Colour job | Where |
|---|---|---|
| Basket identity | Each basket gets an **identity colour + cover art** (generated from its theme or picked by the creator) used on its card, page header, share/OG card, Portfolio row and Activity items | Explore, Basket, Portfolio, share card |
| Stocks | **Real stock logos** (or colour monograms) instead of ticker text; consistent per stock everywhere | Cards, What's inside, Buy logo row, Withdraw table |
| Composition | Donut / stacked bar in stock colours for "What's inside", target vs now | Basket page, Create weights, Change before→after |
| Performance | Gain/loss colours on numbers and chart lines only (always with ▲▼ sign); follower line vs creator line in two distinct hues | Charts, PnL pair |
| Success | A brief colour moment on buy/create success (basket colour fills the check), no confetti | Buy, Create, Claim success |
| Status | Market pill (open / closed), pending-change countdown, "held for you", test-mode ribbon each get their own consistent signal colour | Global |
| Creator | Avatar ring in the creator's chosen colour; "Creator invested" badge | Card, Creator page |
| Funding | Provider / exchange / payment-method logos (UPI, PIX, QRIS, Binance…) | Add money |
| Empty states | One accent colour in the line illustration | Empty states |

---

## 1. Personas

Four personas. The first is the one we design for; the others must not be broken by those choices.

### P1. Asha, first-time investor (primary)
- **Who:** 26, Pune. Product analyst. Earns ~₹90k/month. Has a mutual-fund SIP via Groww and a little Nifty ETF. Has never bought a US stock. Has heard of USDT, never held it.
- **Device and context:** Android mid-range (Redmi/Realme), Chrome. Good 4G at home, patchy on the commute. Uses the app in short bursts, mostly evenings (which is US market open: 20:00–02:30 IST).
- **Money:** Wants to try with ₹500–₹2,000 ($6–$24). Will add monthly if it works. Uses UPI for everything.
- **Goals:** Own "the AI story" without picking tickers. Feel smart, not lucky. Something she can explain to a friend.
- **Fears:** Losing money to a scam. Crypto tax rules (India taxes crypto/VDA gains at 30% plus 1% TDS [S11]) and "is this even legal for me?". Not being able to get money out. Hidden fees. Being sold to by an influencer who is dumping.
- **Says:** "Who made this basket, and did the people who copied them actually make money?"
- **Implication:** Trust signals (follower PnL, creator stake, "exit anytime") must be visible **before** sign-up. Getting USDC is her wall; we must give her a path that works with UPI/IMPS or say honestly that it doesn't.

### P2. Tunde, crypto-native trader
- **Who:** 31, Lagos. Freelance dev paid in USDC/USDT. Uses Binance P2P, Bybit, a Phantom and a MetaMask wallet. Trades memecoins on Base.
- **Device:** iPhone + MacBook. Fast on-chain; impatient.
- **Money:** Already holds $500–$5,000 in stablecoins. Naira is volatile, so dollar assets are a hedge.
- **Goals:** Dollar-denominated stock exposure without a US broker. Composability: "can I take the stock tokens out?" Verify contracts.
- **Fears:** Rugs, admin keys, hidden mint/fee logic, lockups, getting stuck in a vault. Wrong-network sends (USDT on Tron vs USDC on Base).
- **Says:** "Show me the contract, the oracle, and who can move my funds."
- **Implication:** Simple by default, **Details on demand** (contract, roles, bands, feeds). Support "Send from another wallet" with exact network guardrails. Possibly connect an external wallet (open question).

### P3. Kavya, creator / finfluencer
- **Who:** 29, Bengaluru (or São Paulo). 40k followers on X and Instagram posting market threads. Monetises with a paid Telegram group today.
- **Device:** Phone for posting, laptop for research.
- **Money:** Will seed $50–$500 to show conviction.
- **Goals:** Turn a thesis into a product that followers can buy in one link. Earn recurring fee income. Look credible, not like a shill.
- **Fears:** Followers losing money and blaming her. Looking like a pump. Regulatory heat (SEBI's finfluencer rules in India *(verify current scope)*). Doing a recipe change and getting backlash. Complicated creation.
- **Says:** "Can I launch in five minutes and share a link that looks good on X?"
- **Implication:** Create in one sitting, share card immediately, a proposal flow that forces a reason (protects her too), honest follower PnL (it is her proof), and creator earnings that are easy to read.

### P4. Jordan, hackathon judge
- **Who:** Base ecosystem reviewer evaluating 30+ Stocks Maxxing entries in a day.
- **Device:** Laptop, Chrome, maybe a phone for a QR. Has a Base wallet but won't want to use it.
- **Time:** 2–5 minutes per project before forming an opinion.
- **Goals:** See it work end to end on-chain. Understand the novel bit (basket + creator + auto-rebalance with notice + in-kind exit) fast. Confirm it is really on Base.
- **Fears (as a user):** Wasting time on sign-up, faucets, gas, broken testnet, a demo that only works in a video.
- **Implication:** A dedicated **2-minute judge path** with one-tap test money, a pre-seeded basket with history, a 10-minute demo recipe change in progress, and a basescan link on every receipt.

---

## 2. Jobs-to-be-done and value moments

### Jobs

| Persona | Main job | Supporting jobs |
|---|---|---|
| Asha | "When I hear about a big theme (AI, space), help me put a small amount of money into it with someone credible, so I don't have to pick stocks." | Know if it's legit · get dollars in · see how I'm doing · get out when I want |
| Tunde | "When I hold idle stablecoins, help me hold diversified US stock exposure that I can verify and exit on-chain." | Verify contracts · move funds in from my wallet · withdraw the underlying tokens |
| Kavya | "When I have a market thesis, help me package it into something followers can buy and that pays me as it grows." | Launch fast · share well · explain changes · see earnings |
| Jordan | "When I evaluate a hackathon entry, help me confirm in two minutes that the core loop works on-chain and is novel." | No setup · see proof (tx links) · see edge-case handling |

### Value ("aha") moments

| Persona | Aha moment | Where it happens | Design target |
|---|---|---|---|
| Asha | **"Followers made money too, and the creator has real money in it."** | Basket page hero (before sign-up) | < 30 s from landing |
| Asha | **"I own a slice of 5 AI companies for $5."** | Buy success → "What you own" breakdown in dollars | First buy within the first session |
| Asha | **"It rebalanced itself, and told me why."** | First drift-trim notice in Activity | First week |
| Asha | **"I can take my money out any time, even at night."** | Sell / Withdraw sheet, market-closed copy | First visit to Exit |
| Tunde | "The stock tokens are real ERC-20s I can withdraw." | Details → contract; Withdraw in-kind success | First session |
| Kavya | **"My basket is live and has a share card."** | Create success | < 5 min from start |
| Kavya | "Someone followed me and I earned my first fee." | Studio / weekly email | First week |
| Kavya | "Followers saw my reason and most stayed." | Proposal executed summary | First recipe change |
| Jordan | **"Buy → drift trim → recipe-change notice → in-kind exit, all on-chain, in 2 minutes."** | Judge path | < 2 min |

---

## 3. Information architecture

### 3.1 Nav model

**Recommendation: four bottom tabs on mobile, same four as a top nav on desktop. Creator tools appear as a fifth tab ("Studio") only after you create a basket.**

| Tab | Purpose | Default for |
|---|---|---|
| **Explore** | Discover baskets and creators. Search. Themes. | Logged-out users; logged-in users with no holdings |
| **Portfolio** | What I own: baskets, loose stock tokens, cash (USDC), "held for you" (owed). Pending changes on my baskets. | Logged-in users with holdings or cash |
| **Activity** | Inbox of things that happened or need a decision: recipe-change notices, trims, receipts, claims, market alerts. | Deep links from notifications |
| **Me** | Account, add money, address, display currency, notifications, legal, help, sign out. Entry to "Build a basket". | — |
| **Studio** (conditional) | My baskets as a creator: earnings, followers, propose/cancel changes, AI suggestions, share. | Creators after first basket |

Why not "Create" as a tab (as in wireframes round 1): it gives 25% of the nav to an action fewer than ~5% of users will take, and it is meaningless before you've invested. Creation stays one tap away from Explore's header ("Build a basket"), the landing page, the empty search state, and Me. Once you are a creator the tab earns its place.

Why an **Activity** tab: Alloy's whole trust story is "we explain changes". Those explanations need a home that persists after a push notification is swiped away. smallcase's pending-update inbox is the right instinct; we keep the inbox but drop the "you must apply it" chore [R1].

### 3.2 Global elements (present on every screen)
- **Market status pill** (US market open / closed · opens in 3h 12m, in local time). Tapping opens a sheet explaining what still works.
- **Environment ribbon** on testnet: "Test mode · play money". Never absent on 84532.
- **Pending-action banner** (one at a time, highest priority): recipe change on a basket you hold < 24h · something held for you to claim · cap/paused state on a basket you're viewing.
- **Add money** sheet, callable from Buy, Portfolio > Cash, Me.

### 3.3 Sitemap

```
Landing (web, logged-out only)  ──►  Explore
│
├─ Explore
│   ├─ Search (baskets · stocks · creators)
│   ├─ Theme chips · Sort
│   ├─ Basket page  /b/:address
│   │   ├─ Hero: price + chart + range
│   │   ├─ Did followers win? (follower vs creator PnL)
│   │   ├─ Skin in the game (creator stake, sells)
│   │   ├─ What's inside (target vs now)
│   │   ├─ How it's looked after (mode, plain language)
│   │   ├─ What changed and why (rebalance feed) + pending change card
│   │   ├─ Details (contract, roles, bands, feeds, max rebalance, notice, cap)
│   │   ├─ [sheet] Buy  ──► [sheet] Add money (if short)
│   │   ├─ [sheet] Exit: Sell to USDC | Get the stocks (withdraw in-kind)
│   │   └─ [sheet] Share
│   ├─ Creator page  /c/:address (baskets, track record, stake)
│   └─ Stock page (light: what it is, which baskets hold it)
│
├─ Portfolio
│   ├─ Total (USD, optional local estimate) + chart
│   ├─ Baskets (rows → basket page)
│   ├─ Stocks (withdrawn tokens; Sell / Send)
│   ├─ Cash (USDC: Add · Send out)
│   └─ Held for you (owed: Claim)
│
├─ Activity
│   ├─ Needs you (recipe-change notices open, claims)
│   ├─ Updates (trims done, recipe changes done/cancelled, market alerts)
│   └─ Receipts (buy/sell/withdraw/claim with tx links)
│
├─ Me
│   ├─ Add money (Faucet on testnet | Send from app/exchange | Buy with local money)
│   ├─ Your account address (Base) · Send out
│   ├─ Notifications (email, push, Telegram)
│   ├─ Display currency
│   ├─ Build a basket
│   ├─ Help · How Alloy works · Fees · Legal · Not for US persons
│   └─ Sign out
│
└─ Studio (creators only)
    ├─ Overview (AUM, fees earned, followers)
    ├─ Basket ▸ Propose change ▸ Pending (countdown · Cancel with reason)
    ├─ Suggestions (AI, labelled)
    └─ Share kit

Create flow (full-screen, 5 steps): Idea → Stocks → Weights → Strategy & fee → Seed & launch → Share
Judge path (testnet): /try → one-tap account → faucet → guided tour (§4.4)
```

### 3.4 What lives where, and why

| Thing | Lives | Why |
|---|---|---|
| Follower vs creator PnL | Basket page hero + Explore card | It's the differentiator and the trust answer. Must be seen before sign-up. |
| Creator stake | Basket page, card, creator page | Skin-in-the-game is the second trust answer. |
| Pending recipe change | Basket page card, Explore card pill, Portfolio row badge, Activity "Needs you", banner | Nobody should buy blind into a change, and holders who never open the basket page must still see it. |
| Drift trims | Basket feed + Activity "Updates" | No action needed; must be explainable later. |
| Withdraw in-kind | Inside the **Exit** sheet as an equal option, plus Basket overflow | It's a feature, not an emergency. |
| Owed / held for you | Portfolio section + Activity "Needs you" + banner | Partial success must not be lost. |
| Add money | Inline in Buy when short; Portfolio > Cash; Me | Funding is part of buying, not a separate errand. |
| Mechanics (bands, feeds, roles, contract) | Basket page "Details" | Simple by default (Pendle "Earn vs Trade" lesson [R24]). Tunde and judges open it. |
| US-person attestation | First money action | Not at browse. Required before buy/create. |
| Testnet labelling | Global ribbon + every amount reads "test $" in receipts | Avoid anyone thinking it's real money; avoid screenshots that mislead. |

### 3.5 URL scheme (for sharing and deep links)
`/` landing · `/explore` · `/b/:addr` basket (SSR + OG image) · `/b/:addr?buy=25` opens Buy prefilled · `/b/:addr/change` opens the pending change sheet (notification target) · `/c/:addr` creator · `/portfolio` · `/activity` · `/me` · `/me/add-money` · `/create` · `/studio` · `/try` judge path.

---

## 4. End-to-end journeys

### 4.1 First-time follower (Asha)

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Discover | Sees a creator's X post with a basket share card; taps the link on her phone | "Is this another crypto thing?" | Curious, wary | Lands on a crypto-looking page; slow load on 4G | SSR basket page with OG card; first paint < 2s; no wallet prompt; plain "US stocks, from $5" |
| 2. Understand | Reads basket page: thesis, followers vs creator, stake, what's inside | "Did people like me make money? Is the creator in it?" | Reassured if numbers are honest | Jargon (NAV, drift, B20); USD-only numbers feel abstract | Plain labels with 6-word helpers; optional "≈ ₹" estimate; "How it works" 3-step sheet |
| 3. Decide | Taps **Buy** | "OK, $5 is fine to try" | Hopeful | Fear of commitment; tokenized vs shares | "From $5 · Sell anytime · Even at night, you can take the stocks out" under the button |
| 4. Sign up | Email or phone OTP (Privy), attest not-US | "Why do they need this?" | Mild friction | SMS OTP delays in India; Google sign-in unavailable in some webviews (in-app browsers from X/IG) | Email OTP default; detect in-app browser and offer "Open in Chrome"; one-line "why we ask" |
| 5. Fund | Sees "You need USDC" | "What is USDC? How do I get it with UPI?" | **Anxious; highest drop-off** | No direct UPI → USDC on Base in most widgets (see §5.2); wrong-network sends; minimums above $5 on on-ramps | Region-aware Add money (§5.2); pre-flight checklist; live "waiting for your USDC" screen; testnet: one tap |
| 6. Buy | Back in Buy with amount kept; confirms | "Is the price fair? Any fee?" | Tense → relieved | Quote refresh; slippage failure; market closed warning | Fee shown as "$0.004/month on $5"; one review; clear "Nothing was spent" on failure |
| 7. Own | Success: "You own a slice of 5 companies" | "Cool, I actually own something" | Proud | Token amounts (2.30 AIB) mean nothing | Show dollars per stock; prompt to turn on notifications here (value moment) |
| 8. First rebalance | Gets "The AI Build-Out was trimmed. NVDA ran ahead." | "Did I lose money? Did I need to do something?" | Mild alarm → trust if explained | Unexpected; cost not understood | "No action needed" first line; cost in $ for *her* holding; link to "why we trim" |
| 9. Recipe change (maybe) | Gets 24h notice | "Should I leave?" | Uncertain | Pressure; time zones | Default keep; equal exits; countdown in local time; what changes for *her* ($ moved) |
| 10. Sell | Sells 30% or all | "Will I get my money? How do I get it back to my bank?" | Relief if smooth | Off-ramp to INR is outside Alloy | Sell to USDC works; "Send to exchange" path documented honestly; say we don't off-ramp |

### 4.2 Returning follower

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Trigger | Opens from a notification or habit (evening) | "How am I doing?" | Neutral | Session expired; re-login | Long Privy session; Portfolio is the logged-in home |
| 2. Check | Portfolio total, today, each basket | "Why is it down today?" | Calm or anxious | Day-PnL tinting raises anxiety | Lead with "since you joined"; day change secondary; market status visible |
| 3. Catch up | Activity: trims, notices | "What happened while I was away?" | Informed | Missed push | Unread dot on Activity; summary card "2 updates since Tue" |
| 4. Act | Add more / sell some / decide on a notice | "Should I add more?" | Confident | Re-funding friction | "Buy more" with last amount; saved funding method |
| 5. Explore more | Browses other baskets | "What else is good?" | Curious | Overlap between baskets unknown | "You already own NVDA via The AI Build-Out" hint on basket pages |

### 4.3 Creator (Kavya)

| Stage | Doing | Thinking | Feeling | Pain | Opportunity |
|---|---|---|---|---|---|
| 1. Decide to create | Taps "Build a basket" from landing/Explore/Me | "Is this worth it? 1% of what?" | Curious | Unclear economics | Earnings calculator: "If 200 people put in $50 → ~$80/yr to you" (verify math in UI: 1% × $10k × 80%) |
| 2. Name + thesis | Name, ticker, 280-char thesis, story toggle | "How do I make it sound good?" | Creative | Ticker collisions; story-basket legal lines | Live preview of the share card; auto "not affiliated" + date for story baskets |
| 3. Pick + weight | Picks 2–10 of the universe; sets weights | "Why only 10 stocks?" | Constrained | Small universe looks broken; % math on phone | Say why the list is short; "Split evenly"; typed numbers; warn > 40% |
| 4. Strategy + fee | Picks mode; sees fee fixed 1% | "What do these modes do?" | OK | Abstract modes | Mini simulation: "Last 3 months, this mode would have trimmed 2 times" (stretch) |
| 5. Seed | Seeds ≥ $10 (more = more credible) | "How much should I put in?" | Committed | Needs USDC (same funding wall) | Same Add money flow; "Followers see your stake" |
| 6. Launch + share | Success → Share on X / copy link | "Will anyone follow?" | Excited | Share card ugly; link opens slow | OG card with thesis, top 3, stake; prefilled post |
| 7. Grow | Watches followers, AUM, fees | "Is this working?" | Motivated / anxious | Fees are basket tokens, not USDC | Show fees in $ with "paid as basket tokens" helper |
| 8. Propose change | Edits weights, writes reason, sends 24h notice | "Will followers leave?" | Nervous | Can't see impact; cost estimate | Preview exactly what followers see; estimated cost; who's notified |
| 9. Cancel (maybe) | Cancels with a reason before execution | "I made a mistake" | Embarrassed | Public cancellation | Cancel is normal; reason shown neutrally; followers notified once |
| 10. Executed | Sees result, cost, followers who left vs stayed | "Did it go well?" | Relief | Execution delayed (market closed, feed paused) | Explicit "waiting for market open / healthy prices" state |

### 4.4 Judge (Jordan): the 2-minute path on Base Sepolia

| t | Step | What they see | Proof shown |
|---|---|---|---|
| 0:00 | Opens link from submission → `/try` | "Try Alloy with test money. 2 minutes. Nothing real is at stake." One button: **Start** | Test-mode ribbon |
| 0:10 | Email OTP (or "Continue as guest" if Privy guest accounts are enabled, *verify availability*) | Account created; **1,000 test dollars added** automatically via `dripTo` relayer | Faucet tx link |
| 0:30 | Lands on pre-seeded basket "The AI Build-Out (test)" with 2 weeks of history, ≥ 1 trim and an open 10-min demo recipe change | Follower vs creator PnL, feed, pending change card | Contract link in Details |
| 0:45 | Buys $100 | Receipt: what you own in dollars per stock | Buy tx |
| 1:05 | Opens the pending change: "Changes in 6 min · TSLA → AMZN · reason" | Keep / Sell / Withdraw | `RecipeProposed` tx |
| 1:20 | Taps **Get the stocks** for 30% (in-kind) | 5 stock tokens in Portfolio > Stocks | Withdraw tx |
| 1:40 | Optional **Demo lab** (testnet only): "Move NVDA +20%" → keeper trims within ~1–2 min | Trim appears in feed with reason and cost | `Rebalanced` tx |
| 2:00 | Tour end card: what they just saw + "Build your own basket" + repo/README | Summary of 4 on-chain actions | All tx links |

Edge cases specific to judges: faucet already used today (show remaining balance; we can top up via relayer since we control tUSDC mint); keeper rebalance limit (1/day per basket) means Demo lab must target a **fresh demo basket per judge or a pool of demo baskets** (see Open question 2); testnet RPC slow (optimistic UI with tx pending states); judge on desktop (fully supported, not a phone-only design).

---

## 5. Task flows with all states

Notation: **→** next step, **[state]** a screen state, **⟂** an exit/branch. Each flow lists triggers, happy path, every state, and edge cases. Diagrams for each are in `ux-map.html`.

### 5.1 Sign-up / login

**Trigger:** first money action (Buy, Create, Add money, "Notify me", Studio) or "Sign in". Never on first open.

**Happy path:** Buy tapped → [sheet: Make an account] email (default) / phone / Google / passkey → OTP → [attest: not a US person + allowed where I live] → return to the action that triggered it, with its state intact (amount, basket).

| State | Behaviour |
|---|---|
| OTP sent | Resend after 30s; "Check spam"; switch method |
| OTP wrong / expired | Inline error, keep the field; 5 tries then cooldown |
| SMS not arriving (common on Indian DND numbers *(verify)*) | After 45s, offer email |
| In-app browser (X, Instagram, Telegram) | Detect; Google OAuth often blocked in webviews *(verify per platform)* → hide Google, show "Open in Chrome/Safari" |
| Attestation declined ("I am a US person") | Explain we can't serve them; allow browsing only; no funding UI |
| Returning user, new device | Same email → same embedded account (Privy) |
| Session expired mid-flow | Re-auth sheet over the current screen; resume the action |
| Privy outage | "Sign-in is down. Browsing still works." Retry with backoff |
| Account created but attestation not done | Any money action re-shows attestation |
| Already signed in on testnet and mainnet | Separate environments; never mix balances (Decision D9) |

**Never:** seed phrase, "connect wallet" as the first option, KYC forms.

### 5.2 Funding ("Add money")

The hardest real-world step. Three routes, ranked by environment and region. The sheet remembers the triggering amount ("You need $20.00 more for this buy").

**Testnet (84532)**
→ [Add test money] one button "Get 1,000 test dollars" → relayer calls `dripTo(user)` (no gas needed by user) → [pending ~2–5s] → [success: balance updated] → return to Buy.

| State | Behaviour |
|---|---|
| Already claimed today | "You've had today's 1,000 test dollars. Next refill in 7h 12m." If balance < $5, offer an admin top-up path for judges (relayer) |
| Faucet daily cap hit (`maxDripsPerDay`) | "Test money is out for today." Show judge fallback contact; this must not happen during judging (ops alert) |
| Relayer down | Fallback: user-paid `drip()` only works with sponsored gas; otherwise show an error and contact |

**Mainnet (8453): route A, "Send from an exchange or app"** (recommended primary for P2 and many P1)
→ [Choose where from: Binance · Coinbase · Bybit · OKX · other wallet] → [Instructions per source: **Asset USDC · Network Base** (big), address with copy + QR, minimum recommended $5] → [Waiting for your USDC… listening] → [Arrived: $X USDC] → return to Buy.

| State | Behaviour |
|---|---|
| Wrong token arrives (USDT, ETH on Base) | Detect; "We got USDT, not USDC. Swap it to USDC" (one-tap swap, stretch) or instructions |
| Wrong network (USDC on Ethereum/Polygon/Tron/BSC) | We can't see it. Pre-flight checklist must prevent it: "Pick **Base** as network. Other networks can lose your money." Help article for recovery (same address works on EVM chains, Tron doesn't) |
| Exchange doesn't support Base withdrawals | Per-source tip; suggest an alternative source |
| Long wait (> 10 min) | "Still waiting. Exchanges can take up to 30 min." Leave and get notified on arrival |
| Below $5 arrives | Credited; "Add $X more to buy" |

**Mainnet: route B, "Buy with local money"** (on-ramp widget; region-aware)
→ [Country detected, editable] → [Provider list: only providers that support that country + USDC on Base; show method (UPI/IMPS, bank transfer, PIX, QRIS, card), fee, minimum, KYC level] → widget (KYC happens in provider) → [Processing] → [Arrived].

Research summary (route B coverage is uneven, and this is the core reason route A matters):
- **Coinbase Onramp:** available where Coinbase operates; guest checkout (no Coinbase account) was limited to US/UK/CA and is being retired in the hosted widget [S1][S2]. Coinbase reopened in India in Dec 2025 and added IMPS rupee rails in 2026, not UPI [S9][S10] *(verify current state)*. Testnet: not available [S5].
- **Transak:** India launch included UPI; tiered KYC (light ≈ up to $200 in ~30s, standard up to $25k in ~10 min) [S3][S4] *(verify India limits)*.
- **MoonPay:** PIX for BRL in Brazil; India listed as restricted/prohibited; Nigeria contested [S6][S7] *(verify)*.
- **Onramper (aggregator):** claims 130+ payment methods, 190+ countries; Nigeria P2P bank transfer via partners (Yellow Card, Wello); Brazil PIX; notes QRIS converts at 56% vs 3.6% for cards in Indonesia [S8].
- **Privy funding:** can enable card / exchange / wallet transfer methods from the dashboard (providers include MoonPay, Stripe, etc.) [S5] *(verify which work for non-US cards)*.

| State | Behaviour |
|---|---|
| No provider for the country | Say so plainly; offer route A and route C |
| Provider minimum > the amount (e.g. $20–$30 minimums are common *(verify)*) | Show the minimum before opening the widget |
| KYC failed / pending in provider | "Your payment provider is checking your ID. That's them, not us." Keep Alloy usable |
| Payment done, USDC not arrived | Keep listening; show provider order status link |
| Card declined (common for crypto MCCs in India/Nigeria *(verify)*) | Suggest local method or route A |

**Mainnet: route C, "Other ways"** (guidance only, link-out): P2P on major exchanges (Nigeria/India users already use them; escrow model) [S12], with a safety checklist (only in-app escrow, never off-platform). We don't integrate P2P.

### 5.3 Buy

**Entry points:** Basket page sticky "Buy" · card quick-buy (no; one entry keeps it clear) · `?buy=` deep link · "Buy more" on Portfolio row.

**Happy path:** [Buy sheet: amount keypad, presets $5/$25/$100/Max, balance line, "what you'll own" in $ per stock, fee in $/month] → [Review inline: price, price impact, max slippage, fee "on us"] → **Confirm** → [Pending: "Buying 5 stocks… ~5s"] → [Success: "You own a slice of 5 companies" + per-stock $ + receipt link] → prompt notifications (first buy only).

Under the hood: quote → simulate → USDC permit/approve exact → `router.buy(minOuts, minShares)` → receipt check → invalidate.

| State | Behaviour |
|---|---|
| Not signed in | 5.1 then back here with amount |
| Below $5 | Inline "Minimum is $5" |
| Balance short | Inline "You have $3.20. Add $1.80" → 5.2 → return with amount |
| Quote loading / stale (> 15s) | Skeleton; auto-refresh; never move the number while finger is on Confirm |
| Price moved beyond tolerance before confirm | "Price moved. New estimate…" requires re-confirm |
| Slippage revert | "Prices moved more than 0.5%. Nothing was spent." [Try again] [Edit slippage] |
| Market closed | Allowed. Amber note: "US market closed. Prices can be wider until 8:00 PM." Show price impact prominently. Option "Remind me at open" |
| Feed stale / paused (rebalance-only guard) | Buy works (router has no oracle dependency); note "Rebalances paused for this basket while a price source is checked" |
| Basket at TVL cap | Buy disabled: "This basket is full for now ($5,000 beta limit)." [Watch] [See similar] |
| Amount would exceed cap | Clamp: "Only $640 of room left. Buy $640?" |
| Global pause (issue paused) | "New buys are paused while we check something. Selling and withdrawing always work." |
| Pending recipe change on this basket | Inline card in sheet: "This basket changes in 14h: TSLA → AMZN" [See change]. Not a block |
| Demo basket (10-min notice) | Badge "Demo basket: changes can happen with 10 minutes' notice" |
| Policy-blocked transfer of a component to router/vault (`PolicyForbids` on simulate) | "One stock in this basket can't be bought right now." No tx sent |
| Tx pending > 30s | "Still confirming. You can leave; we'll tell you." Activity receipt shows pending |
| Tx failed (generic) | "That didn't go through. Your USDC is still in your account." |
| Network/RPC error | Retry with fallback RPC; never double-submit (idempotent UI lock) |
| User backgrounds app mid-tx | On return, poll receipt; show result |
| First buy success | Notification opt-in prompt (value moment), share option secondary |

### 5.4 Sell % (to USDC)

**Entry:** Basket page "Sell" (when you own it) → **Exit sheet** with segmented control: **Get USDC** (default) | **Get the stocks**.

**Happy path:** slider 0–100% (stops 25/50/75/All) and/or $ field → live "≈ $37.92 USDC · You keep $88.48" → breakdown (price impact, slippage, no exit fee) → **Confirm** → pending → success "Sold. $37.88 USDC is in your account" + "Send to exchange" link.

| State | Behaviour |
|---|---|
| 0% | Confirm disabled |
| Dust left after sell (< $0.50) | Suggest "Sell all" |
| Market closed | Allowed with amber note; recommend "Get the stocks" for no price impact |
| High price impact (> 1%) | Warn; suggest smaller amount or in-kind |
| Slippage revert | "Nothing was sold." retry |
| Component transfer blocked during redeem | Sell flow's router path: if a component can't be swapped/transferred, simulate fails → offer "Get the stocks" (which handles owed) |
| Pending recipe change | Sheet header shows countdown; selling before is a supported choice |
| Global pause | Never affects sell |

### 5.5 Withdraw in-kind ("Get the stocks")

**Happy path:** same slider → table of stock tokens you'll receive (amount + ≈$) → note "These stay in your account and won't be rebalanced" → **Confirm** → success "5 stock tokens are in Portfolio > Stocks".

| State | Behaviour |
|---|---|
| Any market state, any pause | Always works (redeem can't be paused) |
| One token transfer blocked (B20 policy) | **Partial success:** "4 of 5 came through. Your AMZNc is held for you." → 5.6 |
| All tokens blocked | Same, "held for you" for all; explain likely cause and that claim is available later |
| After withdrawal | Portfolio > Stocks: each token row has **Sell to USDC** (single-stock swap, stretch) and **Send** |
| Corporate action pending on a component | Note: "TSLA has a split scheduled. Your token amount won't change; its price per token will." |

### 5.6 Claim owed ("Held for you")

**Trigger:** `Redeemed` event with non-zero `owedMask`.

→ banner + Activity "Needs you" + Portfolio "Held for you" row → [Claim sheet: token, amount, ≈$, why held] → **Claim** → success, or still-blocked.

| State | Behaviour |
|---|---|
| Claim succeeds | Row moves to Stocks |
| Still blocked | "Still can't send this token to your account. We'll keep it for you; try again later." No penalty, no expiry |
| Claim to a different address | Advanced: "Send to another address" (Tunde) |
| Multiple tokens owed | "Claim all" (one tx per token if contract requires; show progress) |

### 5.7 Recipe-change notice and the 24h window (follower side)

**Trigger:** `RecipeProposed` on a basket the user holds (or watches).

→ push/email/Telegram + Activity "Needs you" + banner + Portfolio badge → [Change sheet: before/after table, creator's reason (quoted), what moves for *your* $ ("About $14 of your $126 moves from TSLA to AMZN"), estimated cost, execution time in local time + "if the market's open, otherwise next open", countdown] → three equal choices:

1. **Keep my basket** (default, also by doing nothing) → item marked "You're staying in" (lets us stop reminders).
2. **Sell** → 5.4 prefilled 100%, editable.
3. **Get the stocks** → 5.5 prefilled 100%.

| State | Behaviour |
|---|---|
| Reminder | One reminder at T−2h only if user hasn't chosen (opt-in setting; default on for holders) |
| Creator cancels (`RecipeCancelled`) | "Kavya cancelled the change: '{reason}'. Nothing changes." Item resolved |
| Time passes, market closed / feed unhealthy | "Due, waiting for the market to open / prices to be healthy." Keep exit options available |
| Executed (`Rebalanced` after proposal) | "Done. Cost $6.10 (0.14%). Your $126 is now on the new recipe." Before/after recorded in feed |
| User already exited | Item shows "You left before the change" (no further notifications) |
| User buys during the window | Buy sheet shows the pending change (5.3) |
| Demo basket (10-min) | Countdown in minutes; badge everywhere |
| AI-originated proposal | Permanent "AI-suggested, approved by @kavya" label |
| Multiple pending changes (shouldn't happen: one Pending slot) | N/A; a new proposal replaces? Contract has one `Pending`; UI shows only latest and a "replaced" note if it changed *(confirm contract behaviour)* |

### 5.8 Drift trim notification

**Trigger:** keeper `Rebalanced` without a pending proposal.

→ Activity "Updates" + optional push (off by default; digest on) → item: "Trimmed: NVDA 41% → 40%. NVDA ran ahead. Cost $1.90 for the basket (≈ $0.06 for you)." → link "Why we trim" (mode explainer). No action.

| State | Behaviour |
|---|---|
| Trim deferred (market closed, feed stale/paused, multiplier change pending, loss budget used) | Basket page "Details" shows "Rebalance waiting: {reason}". No user notification unless > 24h overdue (then one honest note) |
| Trim partially done (chunked across days due to size/caps) | "Trimmed part of the way. More tomorrow." |
| Let Winners Run (no drift trims) | Feed explains "This basket only trims above 40%" |
| Trend-aware skipped a trim | Optional feed note "NVDA above its 50-day average; left alone" (only on the basket page, never pushed) |

### 5.9 Market closed / stale price / paused feed / sequencer

| Condition | Buy | Sell | Withdraw | Rebalance | What the user sees |
|---|---|---|---|---|---|
| US market open, feeds healthy | Yes | Yes | Yes | Yes | Green dot pill "Open · closes 2:30 AM" |
| Market closed (night/weekend) | Yes (warn) | Yes (warn) | Yes | Waits | Amber pill with local opening time; chart flat-dashed since close |
| Market holiday / half day | Yes (warn) | Yes (warn) | Yes | Waits | Explicit holiday copy |
| One feed stale (> 25h) or paused | Yes | Yes | Yes | Blocked | Basket "Details" + feed: "Rebalances paused: price source for AMZN isn't updating." Only push if it blocks a due recipe change |
| Corporate action pending (±1 day) | Yes | Yes | Yes | Blocked | "TSLA split scheduled for Fri. Rebalances wait until after." |
| Global pause (admin) | **No** | Yes | Yes | No | Banner "New buys paused while we check something" |
| Base sequencer down | Txs can't land | — | — | Blocked | "Base network is having trouble. Your money is safe; try again soon." |
| Our API/indexer down | Fallback to chain reads for balances; disable quotes if needed | | | | "Some numbers may be out of date (last updated 12 min ago)" |

### 5.10 Policy-blocked transfer (B20 `PolicyForbids`)
- On **simulate** before any write: decode and explain which token, don't send the tx.
- On **redeem** (withdraw): never blocks; partial → owed (5.6).
- On **send-out** of a withdrawn token from Portfolio > Stocks: "This token can't be sent to that address right now." Suggest selling to USDC.
- Copy rule: say "held for you" or "can't be sent right now", never "failed" or "frozen".

### 5.11 Failed transaction / slippage (generic rules for all writes)
1. Simulate first; most failures should never reach a signed tx.
2. On revert: say what happened, say that nothing was spent (if true), offer one fix.
3. Never auto-raise slippage. "Edit max slippage" is behind "See breakdown", capped at 3% with a warning above 1%.
4. Pending > 30s: allow leaving; receipt lands in Activity.
5. Unknown outcome (RPC timeout): show "Checking…" and poll by tx hash; never invite a second submit until resolved.

### 5.12 TVL cap reached
- Explore card: progress bar appears at > 50% ("$3,100 of $5,000 filled"); at 100% badge "Full".
- Basket page: Buy replaced by **Watch** ("Get told if room opens up"); sells by others free room → notify watchers (batched, max 1/day).
- Partial room: clamp amount (5.3).
- Creators: Studio shows cap usage and "Make another basket" suggestion.

### 5.13 Creator flows

**Create** (full-screen, 5 steps, back never loses input, draft autosaved locally):
1. Idea: name, ticker (uniqueness check), thesis (280), story toggle → source + disclosure date required.
2. Stocks: 2–10 from the universe; explain the list ("stocks with a price feed and enough liquidity").
3. Weights: typed % with "Split evenly"; must total 100; warn > 40% single stock.
4. Strategy + fee: three modes with plain lines; fee fixed 1% ("you keep 80%"); demo flag hidden in prod, visible on testnet ("10-min notice, shown to everyone as Demo").
5. Seed: ≥ $10, presets; funding inline (5.2); summary; **Create basket** (one tx: clone + init + seed).
→ Success: share card + "Share on X" + "Copy link" + "Go to basket".

| State | Behaviour |
|---|---|
| Not attested / not signed in | 5.1 at step 5 (let them design first) |
| Seed too low | Inline |
| Seed swap slippage | Same failure pattern; nothing created |
| Name/ticker offensive or impersonation (e.g. a politician's name) | Soft block with guidance (story baskets: "Name the source, not the person"; OPEN_QUESTIONS #15) |
| Tx pending long | Keep the success screen ready; address shows when mined |

**Propose recipe change** (Studio → basket → Propose): editable New column → reason (required, ≤140) → preview "This is what followers will see" (notice text, timing in their time zones, est. cost) → **Send 24h notice** → Pending card with countdown + **Cancel change** (requires a reason) → executed by keeper at/after time.

| State | Behaviour |
|---|---|
| Weights invalid | Inline |
| Change too big for one day's rebalance (max size) | Warn: "May take 2–3 days to finish at current liquidity" |
| Proposing while one is pending | Replace with warning "This replaces your pending change; followers get a new 24h notice" *(confirm contract)* |
| Cancel | Reason required; followers notified once |
| Execution waits (market/feeds) | Studio shows "Due, waiting for market open" |
| AI suggestion | "Review and send notice" opens the same sheet prefilled; label persists |

**Earn:** Studio shows fees in $ (paid as basket tokens), AUM, followers, follower vs creator PnL (same as public), weekly email summary.

### 5.14 Empty states and first-run

| Context | State |
|---|---|
| First open, logged out | Landing (web) or Explore (if deep-linked). No onboarding carousel. A dismissible 3-line "How Alloy works" card on Explore |
| Signed in, no money | Portfolio: "Nothing here yet. Most people start with $5 in one basket." [Add money] [Explore] |
| Has cash, no baskets | "$212 ready. Pick a basket. You can sell anytime." |
| No activity | "No updates yet. We'll tell you when your baskets change, and why." |
| Basket with 0 followers | Hide follower PnL; show creator stake as the trust signal |
| Basket < 7 days old | "New basket: 5 days of history. Too early to judge returns." Chart min range |
| Search no results | "Build '{q}'" CTA |
| Studio, no baskets | Not shown (tab appears after first basket) |
| Offline | Cached last values with timestamp; disable writes |
| Testnet first run | Ribbon + "Get 1,000 test dollars" as the first action in Portfolio |

---

## 6. Notification and trust map

Principles: notify on **changes to what you own**, never to nudge trading [R18b]. Default channel set for the hackathon: **in-app Activity + email**. Push (web push, after PWA install or explicit opt-in) and Telegram next. Ask permission at a value moment (after first buy, or when tapping "Watch"), with a pre-permission screen [S13]. Android/India opt-in tends to be higher than iOS; Chrome may auto-revoke web-push permission from low-engagement sites (installed web apps are exempt) [S14] *(verify)*.

| # | Trigger (event) | Who | Channel(s) | Timing | Message (short) | Action |
|---|---|---|---|---|---|---|
| N1 | `RecipeProposed` | Holders + watchers | In-app (Needs you) · email · push · TG | Immediately | "{Basket} changes in 24h. @kavya: '{reason}'. Stay in or leave first." | Open change sheet |
| N2 | Reminder before execution | Holders who haven't chosen | Push · TG (not email) | T−2h, once | "{Basket} changes in 2h." | Open change sheet |
| N3 | `RecipeCancelled` | Same as N1 | In-app · email (if N1 was emailed) · push | Immediately | "@kavya cancelled the change: '{reason}'." | None |
| N4 | Recipe change executed (`Rebalanced` after proposal) | Holders | In-app · email · push | Immediately | "{Basket} is on its new recipe. Cost $6.10 (0.14%)." | View feed |
| N5 | Recipe change due but waiting (market/feeds) | Holders | In-app only | When due | "Waiting for the US market to open." | None |
| N6 | Drift trim (`Rebalanced`, no proposal) | Holders | In-app; **weekly email digest**; push off by default | Immediate in-app | "Trimmed NVDA 41→40%. Cost ≈ $0.06 for you." | Why we trim |
| N7 | Rebalance overdue > 24h (feed/caps) | Holders | In-app | Once | "Rebalance waiting: AMZN price source isn't updating. Your money is fine." | Details |
| N8 | Owed credited (`Redeemed` with owedMask) | That user | In-app (Needs you) · email | Immediately | "AMZNc is held for you. Claim anytime." | Claim |
| N9 | Buy/Sell/Withdraw/Claim result | That user | In-app receipt · push only if user left during pending | On receipt | "You're in." / "Sold. $37.88 in your account." | Receipt |
| N10 | USDC arrived (funding listener) | That user | In-app · push (if they left) | On arrival | "$50 USDC arrived. Finish your buy?" | Resume buy |
| N11 | Creator sold ≥ 20% of stake | Holders | In-app · email | Immediately | "@kavya sold 40% of their stake." | Basket page |
| N12 | Basket room opened (cap) | Watchers | Email · push | Batched, max 1/day | "The AI Build-Out has room again." | Buy |
| N13 | Global pause / unpause | Holders | In-app banner · email if > 1h | Immediately | "New buys paused. Selling and withdrawing still work." | — |
| N14 | Market opens and user has a deferred intent ("Remind me at open") | That user | Push · TG | At open | "US market's open." | Resume |
| N15 | New follower(s) | Creator | In-app · daily digest | Daily | "3 new followers today." | Studio |
| N16 | Fees earned | Creator | Weekly email | Weekly | "You earned $2.14 this week." | Studio |
| N17 | AI suggestion ready | Creator | In-app · email | Daily max | "1 suggestion for The AI Build-Out. AI-generated, not advice." | Review |
| N18 | Creator's change executed / waiting | Creator | In-app · email | On event | "Your change ran. 92% of followers stayed." | Studio |

**Never send:** price-movement nudges, "you haven't checked in", leaderboard rank changes, "others are buying", streaks, confetti.

**Trust surfaces (what we show, where, to answer which fear)**

| Fear | Trust surface | Where |
|---|---|---|
| "Leaders win, followers lose" | Follower vs creator PnL, same chart | Basket hero, card, Studio |
| "Creator will dump on me" | Creator stake + sell alerts (N11) | Basket, card, notifications |
| "I can't get out" | Exit sheet always on; "Get the stocks" works 24/7 even when paused | Basket, landing, market-closed copy |
| "They'll change it behind my back" | 24h notice, reason, cancel reason, permanent feed | Feed, Activity, N1–N4 |
| "Hidden fees" | Fee in $/month on your amount; trim costs in $ for you | Buy sheet, feed |
| "Is this real / on-chain?" | Contract, roles, oracle status, tx links on every receipt | Details, receipts |
| "Is this legal / am I covered?" | Plain legal lines; tokenized exposure, not shares; not for US persons; we don't do tax | Footer, attestation, Help |

---

## 7. Decision log

| # | Decision | Options | Recommendation | Rationale |
|---|---|---|---|---|
| D1 | When to ask for sign-up | (a) On open (b) At first money action (c) After N screens | **(b)** | Trust signals must be seen first; Robinhood/feel.cash browse-first [R]; smallcase also lets you browse before broker connect [S15] |
| D2 | Primary nav | (a) Explore/Portfolio/Create/Me (round 1) (b) Explore/Portfolio/Activity/Me + conditional Studio (c) No tabs, single feed | **(b)** | Activity is where our "explain, don't ask" promise lives; Create is a rare action |
| D3 | Funding inside Buy vs separate | (a) Separate "Deposit" first (b) Inline when short, return to Buy with amount | **(b)** | Funding is the biggest drop-off; keeping intent alive across it is the main lever [S16] |
| D4 | Mainnet funding routes | (a) On-ramp widget only (b) Send-from-exchange only (c) Both + P2P guidance, region-aware | **(c) with route A first for the hackathon** | On-ramp coverage for IN/NG is patchy and contested [S1–S8]; users there already hold USDT/USDC on exchanges |
| D5 | Testnet funding | (a) User calls `drip()` (b) Relayer `dripTo` automatically on first sign-in (c) Button "Get 1,000 test dollars" via relayer | **(b) for /try, (c) elsewhere** | Zero-step for judges; button keeps it understandable for others; avoids needing Sepolia ETH |
| D6 | Confirm gesture | (a) Hold-to-confirm (round 1) (b) Tap with amount in button (c) Swipe | **(b)** | The sheet already is the review. Long-press in mobile web conflicts with text selection/context menu and is hard for screen readers; hold discoverability risk was already flagged (OQ #8). Use a 2-step only for > $500 or "Sell all" |
| D7 | Exit UX | (a) Separate Sell and Withdraw sheets (b) One **Exit** sheet: Get USDC / Get the stocks | **(b)** | Users choose *how* to leave in one place; puts in-kind on equal footing (eToro's "Close all vs Keep all" is the same idea [S17]) |
| D8 | Recipe-change response | (a) Must acknowledge (b) Do nothing = stay, optional explicit "Keep" | **(b)** | Avoid smallcase's chore [R1]; explicit Keep only silences reminders |
| D9 | Testnet vs mainnet in one app | (a) Network toggle (b) Separate hostnames/environments with a ribbon | **(b)** | Mixing play and real money is a trust and support hazard |
| D10 | Basket-level vs stock-level vocabulary | "Follow", "Buy", "Watch" | **Buy** = put money in; **Followers** = holders (count); **Watch** = free alerts | "Follow" with no money confuses copy-trading semantics; watchers feed N12 and give Asha a no-money step |
| D11 | Default home when signed in | Explore vs Portfolio | **Portfolio if any balance, else Explore** | Returning users want "how am I doing"; new users need discovery |
| D12 | Performance framing | Day change vs since-joined | **Since you joined** primary, day change secondary | Reduces anxiety and trading nudges; matches long-hold product |
| D13 | Local currency | Off / estimate / priced | **Estimate in grey, on by locale** (keep OQ #7) | Asha thinks in rupees; never price in local currency |
| D14 | Demo lab for judges | (a) None (b) Testnet-only scenario buttons | **(b)** behind `/try`, rate-limited | Shows drift trims and guards live in 2 min; we control the testnet world |
| D15 | Notification channels v1 | In-app, email, web push, Telegram | **In-app + email now; Telegram + push next** | Matches OQ #9; push permission asked at value moment |
| D16 | Creator tab | Always vs conditional | **Conditional "Studio"** | Progressive disclosure |
| D17 | "Details" for mechanics | Always visible vs toggle | **Toggle / section at bottom** | Simple by default; Tunde and judges know to look |
| D18 | Market-closed trading | Block vs warn | **Warn** (architecture allows 24/7) + "Remind me at open" | Honest, keeps control with the user, nudges in-kind for exits |
| D19 | Text density | Explain inline vs progressive disclosure | **Word budgets per screen (§0.1) + "i"/sheets for explanations** | Founder feedback; premium apps say less; also faster on 4G and easier to localise |
| D20 | Basket identity | Text-only cards vs identity colour + cover + stock logos | **Identity colour + cover + logos** | Founder feedback; makes "stories, not symbols" visual; carries across share cards and Portfolio |

---

## 8. Critique of wireframes round 1

Mapped to the flows above. "Keep" means carry into the redo.

| Wireframe section | Keep | Change | Flow |
|---|---|---|---|
| 1 Landing | Story-first headline; follower-first live cards; plain legal | Add a **"Try with test money"** CTA on testnet (judge path); add "Exit anytime, even at night" as a proof stat; the bust/headset art is costly and slow on 4G: make it optional/lazy | 4.1, 4.4 |
| 2 Sign-up | Triggered at first Buy; no "wallet"; attestation never pre-ticked | **Google first is risky in in-app browsers** (X/IG links are our main acquisition): email first + "Open in browser". Add-money sheet is generic: needs region-aware routes, network guardrails, waiting/arrived states, and return-to-buy. The "Add $25" button implies we can charge a card, which we may not | 5.1, 5.2 |
| 3 Explore | Theme chips; follower-first card; stake; "Changing in 14h" pill; story disclosure on card | Default sort "Best for followers (1M)" conflicts with OQ #3's own recommendation (Most followed): pick one. Add cap progress / "Full". Card has no quick way to Watch | 5.12 |
| 4 Basket detail | Order: what → how → did followers win → who → inside → changes; Details toggle | Add **Exit** entry with equal options; a pending-change card near the top (not only in the feed); "since you joined" for holders; new-basket state | 5.3–5.7 |
| 5 Buy | Keypad + presets; breakdown collapsed; fee "nothing today" | Replace hold with tap (D6); inline short-balance → Add money → return; cap clamp; pending-change notice inside sheet; per-stock $ in success | 5.3 |
| 6 Sell | % slider with stops; "you'll keep" line; link to withdraw | Merge with Withdraw into Exit sheet (D7); high-impact warning; dust → Sell all | 5.4 |
| 7 Withdraw | "Take your stocks out" as a feature; "held for you" partial | Needs a home for withdrawn tokens' next actions (sell single stock / send) and the claim flow screens | 5.5, 5.6 |
| 8 Recipe change + feed | Countdown banner; three equal choices; AI label persists; per-change cost | Show impact **for me** in $; add cancelled / waiting-for-market / executed states; add reminder rule; Activity inbox as the persistent home | 5.7, 6 |
| 9 Create | One thing per screen; story toggle; typed weights; share card | Ask sign-in at step 5, not before; funding inline at seed; earnings calculator; demo flag visible on testnet; impersonation guidance | 5.13 |
| 10 Creator dashboard | Fees in $ explained as tokens; reason required; preview what followers see | Becomes conditional **Studio** tab; add cancel-with-reason flow; execution-waiting states; followers stayed vs left after a change | 5.13 |
| 11 Portfolio | Baskets / Stocks / Cash tabs; local estimate in grey; pending changes on rows | Add **Held for you**; empty/cash-only states; "since you joined" | 5.6, 5.14 |
| 12 Market closed | Honest, amber not red; local time; withdraw = no price impact | Extend into the full condition matrix (stale/paused/corporate action/sequencer/pause) | 5.9 |
| 13 Empty states | One next step + one number | Add testnet first-run, offline, new-basket, Activity empty | 5.14 |
| Missing entirely | — | **Activity inbox**, **judge path / Demo lab**, **funding waiting/arrived**, **claim owed**, **creator cancel**, **notification settings & permission priming**, **error/pending receipts**, **desktop layouts beyond landing/basket** | 3, 4.4, 5, 6 |

### 8.2 Text-heavy places in round 1 and what replaces them (P-1)

| Where (round 1) | Problem | Replace with |
|---|---|---|
| Landing: subhead + 3-step "How it works" + 4-item "No black boxes" + creator section paragraphs | ~150 words before any product | Headline + 3 proof numbers ($5 · 24h · anytime) + live basket cards. "How it works" becomes 3 icons with 2-word labels; trust items become 4 icon chips that open a sheet |
| Landing legal paragraph | Block of text | One micro line + "Legal" link |
| Sign-up 2a body + micro line | Two explanatory sentences | Title "Make an account" + method buttons; "No seed phrase" as a small chip |
| Sign-up 2b attestation | Long sentence + checkbox sentence | Keep (must be read), but one sentence; "Why we ask" as a link |
| Add money 2c | Each route has a sentence; "USDC is a digital dollar" line | Logo rows (UPI, PIX, Binance…) + 1–2 word route names; USDC explainer behind "i" |
| Explore card | Thesis line + holdings text "NVDA 35 · MSFT 25…" + stats text + creator line + badge text (≈ 25–30 words) | Cover colour, name, 3 stock logos, two numbers, avatar + "$1.2k in". Thesis moves to the basket page |
| Explore story-basket disclosure on card | Full sentence on the card | "Story" chip; disclosure date + "not affiliated" on tap and on the basket page (still visible before buying) |
| Basket detail: PnL caption, tooltip text, stake sentence, stats grid helpers, "What's inside" helper, strategy one-liner | Every block has a sentence | Numbers + labels; one "i" per block; strategy as a chip ("Balanced") that opens the explainer sheet; stake as a chip "$1.2k in · 28%" |
| Basket feed items (date + type + changes + reason + cost) | 3 lines each | Icon + before→after chips + $ cost; reason only for recipe changes (creator's words), trims get a 3-word reason |
| Buy sheet breakdown (6 rows) | Already collapsed; good. Default state still has balance line + micro legal + inside-the-basket text | Amount, presets, logo row with $; "Fee $0.004/mo" chip; everything else under "See breakdown" |
| Buy states copy ("Prices moved more than 0.5% while buying…") | Sentences | Icon + "Nothing spent" + one action |
| Sell sheet "After line", breakdown, market-closed note, withdraw link | Four text lines | Slider + result number + "You keep $88" chip; market note as amber pill; Exit sheet's segmented control replaces the link |
| Withdraw: body paragraph + note | Two explanatory sentences | Title "Get the stocks" + logo table; "Won't rebalance" chip |
| Recipe-change sheet: timing line, cost, choice copy paragraph | ~60 words | Countdown + before→after bars + "≈ $14 of yours moves" + three buttons. Timing rule behind "i" |
| Create steps: helper paragraphs (why 10 stocks, fee explanation, notice line) | Text per step | Live share-card preview, stacked weight bar, fee as "1% / yr · you keep 80%" chip; explanations behind "i" |
| Creator dashboard: fee helper, AI card "Why" paragraph | Paragraphs | Numbers with sparkline; AI card shows chips (TSLA ↓ 15→8%) + one-line reason |
| Portfolio: Stocks tab helper, owed row text | Sentences | Chips: "Not rebalanced", "Held for you · Claim" |
| Market-closed copy (several sentences) | Repeated on many screens | One global pill "Closed · opens 8:00 PM"; tap opens a sheet with what still works |
| Empty states | Mostly fine (one line + CTA) | Keep; add accent illustration |

### 8.3 Too much black and white (P-2)
Round 1 is deliberately greyscale with burgundy only for primary actions and a black landing. That reads austere on product screens. Mark these for the visual team: basket identity colours and cover art (biggest single change), stock logos everywhere tickers appear, composition donut/bars in stock colours, two-hue follower vs creator chart lines, a colour moment on success screens, and logos in Add money. Keep signal colours (gain/loss/warn) reserved for meaning so the added colour doesn't compete with them.

---

## 9. Success metrics and instrumentation

### 9.1 North-star and activation
- **Activation:** signed-up user makes a first buy ≥ $5 within 7 days.
- **North star (hackathon):** number of distinct addresses holding a basket token after 7 days (testnet and mainnet reported separately).
- **Creator activation:** created basket gets ≥ 1 non-creator buyer within 7 days.

### 9.2 Per-flow metrics

| Flow | Primary metric | Target (initial guess, to calibrate) | Drop-off points to watch |
|---|---|---|---|
| Discover → basket page | Basket-page views per landing visit; scroll depth to "Did followers win?" | > 60% reach the PnL card | Slow SSR; in-app browser issues |
| Sign-up | Buy-tap → account created | > 70% | OTP not received; Google in webview; attestation decline |
| Funding (mainnet) | Account → funded (≥ $5) within 24h; median time-to-fund | > 30% *(fintech funding drop-offs of ~60% are reported [S16], so expect this to be the worst step)* | Route chosen → never arrived; wrong-network help views; provider KYC |
| Funding (testnet) | Account → faucet success | > 95%, < 10s | Relayer failures; daily cap |
| Buy | Buy sheet open → success | > 80% | Quote stale; slippage reverts; cap; confirm abandon |
| Time to first buy | Median from first visit to first buy | testnet < 3 min; mainnet < 20 min (same session) | — |
| Recipe change | % holders who opened N1; % who chose keep/sell/withdraw; % exits | Opened > 50% | Panic exits right after notice (compare with trims) |
| Drift trim | % holders who viewed explanation; support tickets per trim | Low tickets | "Did I lose money?" confusion |
| Exit | Exit open → success; in-kind share of exits; owed claims completed | — | High-impact sells off-hours |
| Creator | Create start → live; time to live; share rate; proposals with cancel rate | Start → live > 50%; median < 5 min | Weights step; seed funding |
| Judge path | `/try` start → tour end; median duration | > 80%; < 2:30 | Faucet, RPC latency, demo-lab rate limit |
| Notifications | Pre-prompt shown → accepted → OS granted (separately) [S13]; N1 open rate | — | Prompt at the wrong time |

### 9.3 Events to instrument (names are proposals)

`landing_view`, `basket_view{basket, source, is_holder}`, `pnl_card_seen`, `details_opened`, `buy_tap`, `auth_start{method, in_app_browser}`, `auth_otp_sent`, `auth_success`, `attest_shown`, `attest_accepted|declined`, `add_money_open{trigger, short_by}`, `funding_route_selected{route, country, provider}`, `funding_instructions_copied`, `funding_waiting_start`, `funding_arrived{amount, token, network_ok}`, `funding_wrong_token`, `faucet_request|success|fail{reason}`, `buy_sheet_open`, `quote_received{impact_bps, market_open}`, `buy_confirm`, `tx_submitted{kind}`, `tx_success|revert{kind, reason}`, `exit_open{mode}`, `sell_confirm{pct}`, `withdraw_confirm{pct}`, `owed_credited`, `claim_success|fail`, `notice_open{source}`, `notice_choice{keep|sell|withdraw}`, `trim_explainer_open`, `watch_tap`, `notif_preprompt_shown|accepted`, `notif_os_granted|denied`, `create_step{n}`, `create_success`, `share_tap{target}`, `propose_sent`, `propose_cancelled`, `try_start`, `try_step{n}`, `demo_lab_action{scenario}`, `try_complete`.

Properties on every event: environment (84532/8453), market_open, country (coarse), device class, logged_in, has_balance. Join with chain data (Ponder) on address for funnel truth; never send wallet addresses or emails to analytics in clear (hash).

---

## 10. Open questions for the founder

Prioritised by how much they block the redo. Each has a recommendation so "yes" is enough.

1. **Which market do we design funding for first: India, Nigeria, Brazil or Indonesia?** Coverage differs completely (UPI/IMPS vs naira P2P vs PIX vs QRIS). **Rec:** for the hackathon, testnet faucet + mainnet route A ("send USDC on Base from an exchange") only, with Nigeria and India instructions written; add an aggregator (Onramper or Transak) after the hackathon once we've checked live coverage per country.
2. **Judge path: OK to ship `/try` with automatic test money and a Demo lab (testnet-only scenario buttons)?** The keeper can rebalance a basket at most once a day, so the lab needs a pool of fresh demo baskets or a per-judge demo basket. **Rec:** yes; pre-create ~20 demo baskets with history and hand them out round-robin.
3. **Replace "Create" tab with "Activity" and a conditional "Studio"?** **Rec:** yes (D2, D16).
4. **Tap-to-confirm instead of hold-to-confirm?** **Rec:** tap with the amount in the button; 2-step only above $500 or for "Sell all" (D6). Supersedes OQ #8.
5. **Merge Sell and Withdraw into one Exit sheet?** **Rec:** yes (D7).
6. **Testnet and mainnet: separate URLs?** **Rec:** yes, e.g. `try.` for testnet with a permanent ribbon, and the main app on mainnet (D9).
7. **Do we allow connecting an external wallet (Tunde) or only Privy embedded?** **Rec:** embedded only for v2; "Send from another wallet" covers funding. Revisit after the hackathon.
8. **"Watch" (free alerts) as a first-class action?** **Rec:** yes; it's the no-money step for Asha and the waitlist for full baskets.
9. **Notification channels for launch:** **Rec:** in-app + email now; Telegram bot next; web push only with a pre-prompt after first buy (D15).
10. **India legal/tax posture:** Do we say anything about Indian residents' tax (VDA 30% + 1% TDS) or remittance rules? **Rec:** a neutral Help article ("We don't give tax advice; here's what to ask an accountant"), no in-flow claims. Needs a lawyer before mainnet marketing in India.
11. **Execution timing copy:** "at the time if the market is open, otherwise next open". Confirm the keeper's rule so the countdown is truthful, and whether a new proposal can replace a pending one (contract has one Pending slot).
12. **Owed claims:** can anyone call `claimOwed` for a user (so we can retry for them), or only the user? **Rec:** if contract allows `to` = user only, let a relayer retry; otherwise one-tap claim.

---

## 11. Sources

Prior research is cited as [R#], pointing to [RESEARCH.md §5](../RESEARCH.md#5-citations) (e.g. R1 smallcase rebalance chore, R18b Robinhood gamification, R24 Pendle).

New for this map (fetched 2026-11-19 via search; *(verify)* where marked in the text):

- [S1] Coinbase Onramp FAQ (guest checkout limits/deprecation): https://docs.cdp.coinbase.com/onramp/additional-resources/faq
- [S2] Coinbase Onramp countries and payment methods: https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/countries-&-currencies · https://docs.cdp.coinbase.com/onramp/additional-resources/payment-methods
- [S3] Transak KYC levels: https://docs.transak.com/guides/transak-different-kyc-levels
- [S4] Transak India / UPI: https://yourstory.com/the-decrypting-story/transak-india-crypto-payment-gateway-fiat-on-ramp · https://transak.com/blog/transak-expands-in-india-to-empower-web3-developers-to-onboard-the-next-billion-users
- [S5] Privy account funding: https://docs.privy.io/recipes/account-funding/overview · https://privy.io/blog/introducing-global-fiat-onramps (testnet non-availability of card/Coinbase funding is from a third-party guide, *verify*)
- [S6] MoonPay country coverage: https://dev.moonpay.com/docs/country-coverage · https://support.moonpay.com/customers/docs/moonpays-supported-countries
- [S7] MoonPay payment methods (PIX): https://support.moonpay.com/customers/docs/all-supported-payment-methods
- [S8] Onramper (Nigeria coverage, QRIS stat, Yellow Card): https://www.onramper.com/country-coverage/NG · https://www.onramper.com/blog/unlocking-high-conversions · https://onramper.com/blog/yellow-card-partners-with-onramper-to-enhance-crypto-onboarding-in-africa
- [S9] Coinbase reopens India: https://www.theblock.co/news/business/2025-12-07-coinbase-resumes-user-onboarding-india-381644
- [S10] Coinbase India rupee rails (IMPS): https://coin360.com/news/coinbase-india-direct-inr-rails · https://lcx.com/en/cryptonews/coinbase-launches-rupee-bank-rails-in-india-after-fiu-nod
- [S11] India crypto tax 30% + 1% TDS (reported in coverage above, e.g. https://coinmarketcap.com/academy/article/coinbase-reopens-india-app-after-two-year-regulatory-break) *(verify with a tax source)*
- [S12] Nigeria P2P escrow mechanics (secondary, low quality): https://thecondia.com/buy-stablecoins-safely-nigeria/ · https://stablecoininsider.org/usdt-to-naira/ *(verify; Binance naira status contested)*
- [S13] Push permission priming/timing: https://doc.batch.com/guides-and-best-practices/orchestration/how-to-improve-the-push-opt-in-rate · https://appmaster.io/blog/push-notification-permission-ux (vendor sources)
- [S14] Push in India / web push: https://business.adobe.com/blog/the-latest/mobile-push-impressions-in-india-the-opportunity-ahead · https://www.mobiloud.com/blog/pwa-push-notifications
- [S15] smallcase onboarding (browse before broker): https://www.smallcase.com/learn/how-to-invest-in-smallcase/ · Upstox login: https://upstox.com/help-center/how-do-i-login-into-a-smallcase-with-upstox-248819
- [S16] Funding-step drop-off (vendor/consultancy data): https://www.pedowitzgroup.com/what-causes-high-abandonment-at-the-funding-step-and-how-to-reduce-it · https://formo.so/blog/defi-onboarding-first-activation · https://www.transfi.com/blog/reducing-abandonment-rates-in-crypto-onboarding-with-transfi-a-ux-success-story
- [S17] eToro stop copy (Close all vs Keep all, pause): https://www.etoro.com/copytrader/how-it-works/ · https://goodmoneyguide.com/news/etoro-stop-copy-keep/ · https://etoro.com/blog/product-updates/20052014/pauseresume-copy-graceful-exit

Not researched live (from product knowledge, *verify* before quoting): Revolut and Cash App stock onboarding (in-app balance funds stock buys directly, fractional from $1), Phantom's embedded onboarding and "Buy" on-ramp aggregation, Robinhood's $1 fractional minimum and instant deposits.
