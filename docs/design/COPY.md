# Alloy: on-screen copy (v0.1)

All copy for the key screens, written to match the wireframes in `wireframes.html`. Placeholders are in `{braces}`. Numbers are examples.

---

## 1. Voice

**Who we sound like:** a sharp friend who knows markets. They tell you the number, then what it means, then shut up.

### Tone rules
1. **Number first, then meaning.** "Up 12% since launch. Followers are up 11%." Not "Strong performance!"
2. **Short sentences.** Aim for 12 words or fewer. One idea per sentence.
3. **Buttons start with a verb** and say what happens: "Buy $25", "Sell 30%", "Withdraw stocks". Never "Submit", "Continue" (except inside multi-step forms), "OK", or "Let's go".
4. **Say "you" and "we".** We are a product, not an institution.
5. **Wit is seasoning.** One light line per screen at most, and never on money-moving confirmations, errors or legal lines.
6. **Name the risk plainly.** "You can lose money." Not "Investments involve risk of loss of principal."
7. **No hype words, no hedging chains.** Say "may" once, not "may potentially possibly".
8. **Use em dashes sparingly.** At most one per screen; prefer a period or colon. (This doc uses none in UI strings.)
9. **No emoji in product UI.** One is allowed in X share text, if the creator adds it.
10. **Avoid crypto words where a normal word works.**

| Say | Not |
|---|---|
| account | wallet (except Settings > "Your wallet address") |
| fee covered by us | gas sponsored, gasless |
| price | NAV, except in Details |
| stock tokens | B20 precompile tokens |
| basket token | vault share, receipt token |

### Hard-banned words and phrases
unlock · seamless(ly) · empower · revolutionize · elevate · dive in / deep dive · harness · leverage (as a verb) · in today's world · whether you're X or Y · journey · game-changer · next-gen · cutting-edge · democratize · supercharge · effortless · world-class · best-in-class · robust · synergy · "the future of" · "we're excited to" · "say goodbye to" · "look no further"

Also banned:
- rhetorical-question openers ("Ever wondered…?"),
- triple-adjective lists ("smart, simple, secure"),
- exclamation marks on more than one string per screen,
- "guaranteed", "risk-free", "safe returns", "passive income".

### Compliance phrasing (ARCHITECTURE §7), written human
| Rule | Our line |
|---|---|
| Tokenized exposure, not shares | "You get tokenized stock exposure. Not shares, and no shareholder votes." |
| No affiliation | "Alloy is independent. Built on Base, not by Base." Never "backed by", "partnered with" or "powered by" Coinbase or Base. |
| US persons | "Alloy isn't available to US persons. Tap to confirm that's not you." |
| Story baskets | "Built from public disclosures dated {Aug 14, 2026}. {Person} isn't involved with this basket." |
| AI | "AI-suggested. Not investment advice. You decide." |
| Past performance | "Past performance isn't a promise." |
| Can lose money | "Baskets go down too. Only put in what you're fine leaving there for a while." |
| Market closed | "US market's closed. You can still trade, but prices can be wider until it opens. Withdrawing stocks always works." |

---

## 2. Landing / hero

**Kicker (micro):** TOKENIZED US STOCKS · ON BASE

**Headline. Pick one:**
1. **INVEST IN STORIES, NOT SYMBOLS.** *(current X bio; recommended: it's already the brand line)*
2. **BUY THE WHOLE IDEA.**
3. **ONE TAP. A WHOLE THEME.**

**Subhead. Pick one:**
1. Baskets of US stocks built around one idea. Start with $5. We rebalance, you watch.
2. Pick a theme, put in $5, get a basket of US stock tokens that rebalances itself.
3. Curated baskets of tokenized US stocks. See how followers did, not only the creator.

**Primary CTA:**
1. **Explore baskets** *(recommended)*
2. Start with $5
3. See what's inside

**Secondary CTA:**
1. **Build a basket** *(recommended)*
2. Make your own
3. Create and earn 1%

**Proof strip (3 stats):**
- **$5** minimum
- **24h** notice before any recipe change
- **Anytime** exit. Take the actual stock tokens with you.

**How it works (3 steps):**
1. **Pick a story.** AI build-out, space, the stuff Congress buys. Each basket is a recipe of US stocks.
2. **Put in USDC.** From $5. You get one basket token that holds all of it.
3. **We keep it on recipe.** Prices drift, we trim. Every change comes with a one-line reason.

**Trust section. Heading:** NO BLACK BOXES.
- **Followers vs creator.** Every basket shows how followers did next to how the creator did. Same chart.
- **Creators put money in.** You see their stake. If they sell, you see that too.
- **Your exit is always open.** Sell to USDC, or pull out the actual stock tokens. Even when the market's closed.
- **Changes come with notice.** Recipe changes wait 24 hours. You can leave first.

**Creator section.**
- **Heading:** GOT A THESIS? BOTTLE IT.
- **Body:** Pick up to 10 stocks, set the weights, seed it with $10. Earn 1% a year on everything that follows you.
- **CTA:** Build a basket

**Footer legal (micro):** Alloy gives you tokenized stock exposure, not shares. Not available to US persons. Nothing here is investment advice, and baskets can lose value. Alloy is independent and not endorsed by any exchange, issuer or network.

---

## 3. Onboarding (sign-up happens at first Buy)

### Sheet 1: Create account
- **Title:** Make an account
- **Body:** Takes about 15 seconds. No seed phrase, no app to install.
- **Buttons:** Continue with Google · Continue with email · Use a passkey
- **Micro:** We create a secure account for you on Base. You hold the keys; we can't move your money.

### Sheet 2: US-person check
- **Title:** One quick check
- **Body:** Alloy isn't available to US persons (US citizens, residents, or anyone acting for one).
- **Checkbox:** I'm not a US person, and tokenized stocks are allowed where I live.
- **Button:** Confirm
- **Link:** Why we ask

### Sheet 3: Add money
- **Title:** Add USDC
- **Options:**
  - **Card or bank (via {on-ramp})**: "Fastest if you're new."
  - **Send from another app**: "Copy your Base address."
  - **Already have USDC on Base**: "You're set."
- **Micro:** USDC is a digital dollar. 1 USDC ≈ $1.
- **Empty balance helper:** You need at least $5 to buy a basket.

---

## 4. Explore

- **Title:** Explore
- **Search placeholder:** Search baskets, stocks or creators
- **Theme chips:** All · AI & chips · Big tech · Space · Story baskets · Low drift · New
- **Sort:** Most followed · Biggest · Best for followers (1M) · Newest
  - "Best for followers" ranks by follower return, not creator return.

**Basket card**
- **Name (display-m):** THE AI BUILD-OUT
- **Thesis (1 line):** Chips, clouds and the companies paying for both.
- **Holdings:** NVDA 35 · MSFT 25 · GOOGL 20 · +2
- **Stats:**
  - **Followers +11.8%** · Creator +12.4% · 1M
  - **$4,210** in basket · **212** followers
- **Creator line:** by @kavya · has $1,200 in it
- **Badges:**
  - "Story" (story baskets)
  - "Demo: 10-min notice" (demo baskets)
  - "Changing in 14h" (pending recipe change)

**Chip helper for "Story baskets":** Built from public disclosures. Not affiliated with the people named.

---

## 5. Basket detail

**Header**
- **Name:** THE AI BUILD-OUT
- **Under it:** by @kavya · Balanced · 1%/yr
- **Price:** $10.84 per token
- **Change chip:** ▲ +8.4% · 3M
- **Range chips:** 1W 1M 3M 1Y All

**Thesis block**
- **Heading:** Why this basket
- **Body:** Every AI model runs on someone's chips and someone's cloud. This basket owns both sides: the chip makers and the three clouds renting them out. *(creator-written, max 280 chars)*
- **Story basket line:** Built from public disclosures dated Aug 14, 2026. {Name} isn't involved with this basket.

**Followers vs creator (the hero card)**
- **Heading:** Did followers win too?
- **Row 1:** Followers (avg) **+11.8%**
- **Row 2:** Creator **+12.4%**
- **Caption:** Followers trail by 0.6% since launch. That's the fee plus timing.
- **If followers are behind by >5%:** Followers are 7.2% behind the creator. Most joined after the big run.
- **Tooltip "How we count this":** Follower return is the average of every follower's money-weighted return since they joined. Includes fees. Updated every hour.

**Creator stake card**
- **Heading:** Skin in the game
- **Body:** @kavya has **$1,200** in this basket (28% of it). Bought Sep 2. Hasn't sold.
- **If the creator sold:** @kavya sold 40% of their stake on Nov 3.
- **If stake < 1%:** @kavya holds less than 1% of this basket.

**Stats grid**
- In basket **$4,210**
- Followers **212**
- Fee **1% a year** (≈ $0.08/month on $100)
- Biggest drop **−9.1%** (helper: "Worst fall from a high")
- Last rebalance **Nov 14**
- Strategy **Balanced**: "We only step in when a stock drifts far."

**What's inside**
- **Heading:** What's inside
- **Columns:** Stock · Target · Now · Today
- **Row:** NVIDIA (NVDA) · 35% · 37.1% · ▲ 2.3%
- **Helper under table:** "Now" moves with prices. We trim back toward target when something drifts more than 5 points.
- **Tokenized line (micro):** You get tokenized exposure to these stocks, not shares.

**Strategy explainer (bottom sheet)**
- **Balanced:** We only step in when a stock drifts far. If NVDA is meant to be 35% and runs to 41%, we trim it back to 40%.
- **Let Winners Run:** Winners keep growing. We only trim if one stock passes 40% of the basket.
- **Trend-aware:** Rising stocks are left alone. We trim one after two closes below its 50-day average.

**Rebalance feed**
- **Heading:** What changed and why
- **Drift trim item:**
  - Nov 14 · **Trim** · NVDA 41% → 40%, MSFT 22% → 23%
  - Reason: NVDA ran ahead. Trimmed back to the band edge.
  - Cost: $1.90 (0.05%)
- **Recipe change item:**
  - Oct 30 · **Recipe change** · TSLA 15% → 0%, AMZN 10% → 25%
  - "Robotaxi story is priced in. Moving to the company actually renting the GPUs." (@kavya)
  - Cost: $6.10 (0.14%)
- **AI-suggested change (badge):** AI-suggested, approved by @kavya. Not investment advice.
- **Empty:** No changes yet. Last checked 4 min ago. The recipe is on target.

**Sticky bottom bar (mobile)**
- **You don't own it:** [**Buy**] · micro: "From $5"
- **You own it:** "You have $126.40 · ▲ $6.40" · [**Sell**] [**Buy more**]
- **Overflow menu:** Withdraw stocks · Share · View contract

**Details toggle (Pendle-style "advanced")**
Contract address · Basket token symbol · Drift band (5 pts / 25%) · Price sources · Max rebalance size ($2,000 today) · Notice period (24h).

---

## 6. Recipe change notice (banner + sheet)

**Banner (on basket page and portfolio row)**
- **Title:** Recipe change in **14h 22m**
- **Body:** TSLA 15% → 0%. AMZN 10% → 25%. "Moving to the company renting the GPUs."
- **Buttons:** [See change] [Sell before it happens]

**Sheet: See change**
- **Title:** @kavya is changing the recipe
- **Before/after table:** Stock · Now · New
- **Reason block:** quoted reason
- **Timing line:** Happens Nov 21, 9:45 PM IST, if the US market's open. Otherwise at the next open.
- **Estimated cost:** about 0.15% of the basket
- **Choice copy:** Fine with it? Do nothing. Not fine? Sell or withdraw your stocks before then. No fee to leave.
- **Buttons:** [Keep my basket] [Sell] [Withdraw stocks]

**Push / email**
- **Subject:** The AI Build-Out is changing in 24h
- **Body:** @kavya is swapping TSLA for more AMZN. Their reason: "Moving to the company renting the GPUs." Do nothing to stay in, or leave before Nov 21, 9:45 PM IST.

**Done notification:** The AI Build-Out was rebalanced. Cost $6.10. Your basket is on its new recipe.

---

## 7. Buy sheet

- **Title:** Buy The AI Build-Out
- **Amount input:** large `$25`, keypad
- **Presets:** $5 · $25 · $100 · Max
- **Balance line:** You have $212.40 USDC
- **Breakdown (collapsed by default, "See breakdown"):**
  - You get ≈ **2.30** AIB tokens
  - Price per token $10.84
  - Price impact 0.12%
  - Max slippage 0.5% (Edit)
  - Network fee: **On us**
  - Fee: 1% a year, taken as the basket grows. Nothing today.
- **Inside the basket (mini):** NVDA $8.75 · MSFT $6.25 · GOOGL $5.00 · +2
- **Primary:** [**Hold to buy $25**] *(alternatives: "Buy $25" with hold gesture; "Confirm buy")*
- **Micro:** You get tokenized stock exposure, not shares. Baskets can go down.

**States**
- **Below min:** Minimum is $5.
- **Over balance:** That's more than you have. [Add USDC]
- **Price moved:** Price moved since you opened this. New estimate: 2.28 tokens. [Hold to buy]
- **Pending:** Buying… usually about 5 seconds.
- **Success:**
  - **Title:** You're in.
  - **Body:** 2.30 AIB tokens added. Worth $24.94 right now.
  - **Buttons:** [Done] [Share]
- **Fail (slippage):** Prices moved more than 0.5% while buying. Nothing was spent. [Try again]
- **Fail (generic):** That didn't go through. Your USDC is still in your account. [Try again]

---

## 8. Sell sheet (% slider)

- **Title:** Sell The AI Build-Out
- **Holding line:** You have **$126.40** (11.66 AIB)
- **Slider:** 0–100% with stops at 25 · 50 · 75 · All
- **Live readout:** Selling **30%** · ≈ **$37.92** USDC
- **Breakdown:** Price impact 0.18% · Max slippage 0.5% · Network fee: On us · No exit fee
- **After line:** You'll keep $88.48 in the basket.
- **Primary:** [**Hold to sell 30%**] *(alt: "Sell $37.92", "Sell 30%")*
- **Secondary link:** Want the stocks instead of USDC? Withdraw stocks
- **Success:** Sold. $37.88 USDC is in your account.
- **Market closed note:** US market's closed. You can still sell, but prices can be wider until 8:00 PM IST. Withdrawing stocks has no price impact.

---

## 9. Withdraw stocks (in-kind)

- **Title:** Take your stocks out
- **Body:** Swap your basket token for the actual stock tokens inside it. No selling, no price impact. Works 24/7.
- **Slider:** same as Sell
- **You'll receive (table):**
  - NVDAc 0.0123 ≈ $13.40
  - MSFTc 0.0207 ≈ $9.10
  - … (5 rows)
- **Note:** These tokens land in your Alloy account. They won't be rebalanced anymore.
- **Primary:** [**Withdraw stocks**]
- **Success:** Done. 5 stock tokens are in your account. Find them in Portfolio > Stocks.
- **Partial (a token's transfer is blocked):** 4 of 5 came through. Your AMZNc is held for you; claim it anytime from Portfolio. [Claim now]

---

## 10. Market-closed state

- **Status pill:** ● US market closed · opens in 3h 12m
- **Pill when open:** ● US market open · closes 2:30 AM IST
- **Holiday:** US market closed for Thanksgiving. Opens Fri, Nov 27, 8:00 PM IST (half day).
- **Inline on buy:** You can buy now. Prices can be wider until the market opens.
- **Rebalance feed:** Rebalances wait for the market. Next check at open.
- **Chart caption:** Prices frozen since close, 2:30 AM IST.

---

## 11. Create a basket (5 steps)

**Step 1: Name it**
- **Title:** What's the idea?
- **Name field:** Basket name, e.g. "The AI Build-Out"
- **Ticker field:** Token ticker, 3–5 letters, e.g. "AIB"
- **Thesis field:** Why this basket? (280 characters). Placeholder: "Every AI model runs on someone's chips and someone's cloud…"
- **Story toggle:** This is based on someone's public disclosures
  - When on: Source (e.g. "House periodic transaction report") + date. We'll show: "Not affiliated with the people named."

**Step 2: Pick stocks**
- **Title:** Pick 2 to 10 stocks
- **Search:** Search stocks
- **Row:** NVIDIA · NVDA · $182.40 · ▲ 1.2% [+]
- **Counter:** 4 picked

**Step 3: Set weights**
- **Title:** How much of each?
- **Helpers:** Split evenly · Total must be 100%
- **Running total:** 100% ✓ / 92%: 8% left to place
- **Warning if one stock > 40%:** One stock is over 40%. That's a big bet on one company.

**Step 4: Strategy**
- **Title:** How should we look after it?
- **Balanced (Recommended):** We only step in when a stock drifts far.
- **Let Winners Run:** Winners keep growing. We only trim if one takes over.
- **Trend-aware:** Let winners run while they're rising. Trim when the trend breaks.
- **Fee row:** Your fee: 1% a year. You keep 80%, Alloy keeps 20%. Can't be changed later.

**Step 5: Seed it**
- **Title:** Put your money where your thesis is
- **Body:** Seed it with at least $10. Followers see exactly how much you put in.
- **Input:** $ amount, presets $10 · $50 · $250
- **Summary card:** name, 4 stocks, Balanced, 1%/yr, seed $50
- **Notice line:** Changing the recipe later needs 24 hours' notice to followers.
- **Primary:** [**Create basket**]
- **Success:**
  - **Title:** THE AI BUILD-OUT IS LIVE.
  - **Body:** You're the first holder. Share it and see who follows.
  - **Buttons:** [Share on X] [Go to basket]
- **Prefilled X post:** I just launched The AI Build-Out on @alloy_fi: NVDA, MSFT, GOOGL, AMZN. I put $50 in. {link}

---

## 12. Creator dashboard

- **Title:** Your baskets
- **Top stats:** Following you **$4,210** · Fees earned **$11.62** · Followers **212**
- **Fee helper:** Fees are paid in basket tokens, so they grow with the basket.
- **Basket row:** The AI Build-Out · $4,210 · 212 followers · Followers +11.8% / You +12.4%
- **Primary actions:** [Propose a change] [Share]

**Propose a change (sheet)**
- **Title:** Change the recipe
- **Table:** Stock · Now · New (editable)
- **Reason field (required):** Why? One line your followers will read. Placeholder: "Trimming TSLA: robotaxi story is priced in."
- **Notice line:** Followers get 24 hours' notice. They can leave before it happens.
- **Cost estimate:** Estimated cost ≈ 0.14% of the basket.
- **Primary:** [**Send 24h notice**]
- **After:** Notice sent. The change runs Nov 21, 9:45 PM IST. You can cancel until then. [Cancel change]

**AI suggestions**
- **Section heading:** Suggestions
- **Label (always visible):** AI-suggested. Not investment advice. You decide.
- **Card:**
  - Trim TSLA 15% → 8%, add to AMZN.
  - Why: TSLA closed below its 50-day average twice. AMZN is under target by 4 points.
  - Based on prices to Nov 18.
- **Buttons:** [Review and send notice] [Dismiss]
- **Empty:** No suggestions right now. Your baskets are on recipe.

---

## 13. Portfolio

- **Title:** Portfolio
- **Hero:** **$342.18**
- **Today:** ▲ $4.21 (1.2%) today · ▲ $22.18 all time
- **Tabs:** Baskets · Stocks · Cash
- **Basket row:** The AI Build-Out · $126.40 · ▲ 5.3%
- **Row badge:** Changing in 14h
- **Stocks tab helper:** Stock tokens you've withdrawn. They don't rebalance.
- **Cash row:** USDC $212.40 [Add] [Send]
- **Owed row:** AMZNc 0.004 waiting for you [Claim]

---

## 14. Empty states

| Screen | Title | Body | CTA |
|---|---|---|---|
| Portfolio, new user | Nothing here yet | Most people start with $5 in one basket. | [Explore baskets] |
| Portfolio, has cash only | $212.40 ready to go | Pick a basket. You can sell anytime. | [Explore baskets] |
| Creator dashboard, none | You haven't built one | Pick up to 10 stocks, seed with $10, earn 1% a year on followers. | [Build a basket] |
| Explore, search no results | No baskets match "{q}" | Try a stock ticker like NVDA, or build this one yourself. | [Build "{q}"] |
| Rebalance feed | No changes yet | The recipe's on target. We check every minute while the market's open. | none |
| Basket with 0 followers | Be the first follower | The creator has ${seed} in. | [Buy] |
| Stocks tab | No stock tokens | Withdraw a basket to hold its stocks directly. | none |
| Offline | You're offline | Showing prices from {time}. | [Retry] |

---

## 15. Errors and system messages

- **Wrong network or session expired:** Your session timed out. Sign in again to keep going.
- **Rate limited:** Too many taps. Give it a few seconds.
- **Price source stale:** We paused rebalances: a price feed hasn't updated. Buying, selling and withdrawing still work.
- **Basket cap reached (hackathon $5k cap):** This basket is full for now ($5,000 limit during beta). Try another, or follow to get notified.
- **Paused (global):** New buys and rebalances are paused while we check something. Selling and withdrawing always work.

---

## 16. Notifications (opt-in, all skippable)

| Trigger | Copy |
|---|---|
| Recipe change proposed | The AI Build-Out changes in 24h. @kavya: "{reason}". Stay in or leave first. |
| Rebalance done | The AI Build-Out rebalanced. Cost $1.90. Reason: NVDA ran ahead. |
| Creator sold | @kavya sold 40% of their stake in The AI Build-Out. |
| Market open (only if user has a pending action) | US market's open. Your sell order is ready to go. |
| New follower (creator) | 3 new followers on The AI Build-Out today. |
| Fee accrued (creator, weekly) | You earned $2.14 this week from 212 followers. |

**Never send:** "Prices are moving, buy now", streak or "you haven't checked in" nudges, or leaderboard rank-drop alerts.

---

## 17. Seed basket names (suggestions)

"AI Leaders" collides with Bitwise's "AI Leaders" ATP. Alternatives:
- **The AI Build-Out** (used above)
- **Picks & Shovels**
- **Compute**
- **Big Tech, Trimmed** (a Mag-7-like basket with a 20% cap)

Story basket: **Capitol Tech**, "Tech stocks that show up most in recent congressional disclosures." Not affiliated with any member of Congress.
