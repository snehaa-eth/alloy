# Alloy: video concepts for X (Nov 20 – Dec 5, 2026)

Based on `VIRAL_VIDEO_RESEARCH.md`. Brand rules come from `docs/design/TOKENS.md`, `COPY.md` and `MOTION.md`.

**House style for every video**
- **Background:** #0A0A0A. **Type:** #F2F0ED. **Burgundy #6D001A:** under 10% of any frame (silk, a single bar, a border). **Accent #C41A42:** for tiny ticks only.
  - #B5123A fails contrast on #0A0A0A per TOKENS.md, so only use it on big brand moments if at all.
  - Gain is jade #3DBE8B and loss is vermilion #FF6A3D, each with a ▲ or ▼ sign.
- **Type:** Anton, uppercase, tight leading, for headlines. Vertical type rails on the frame edge. Inter for captions.
  - Captions are burned in: max 2 lines, kept out of the bottom 12% where player controls sit.
- **No mascot, no recurring character.** The founder dropped the Caesar bust on 2026-11-19: it reads as an AI-art cliché, means nothing to our users, and premium finance brands don't use mascots.
  - Recognition comes from Anton type, the jewel-tone basket covers, real product moments (numbers, rebalance visuals, share cards) and faceless type-plus-screen videos.
  - Burgundy silk and white smoke are background **textures** only, never a character.
- **Tools:**
  - Screen recordings: Screen Studio or QuickTime.
  - Edit: CapCut (fast) or After Effects (type animation).
  - Cards: Figma.
  - Silk and smoke texture shots: stock footage, or a Midjourney still then Kling, Veo or Runway image-to-video. Generate 6–10 takes and keep 2.
- **Endings:** Every video ends on an action, not a logo. Put the link in the first reply.
- **Compliance footer**, used in the end card or first reply:
  - "Tokenized stock exposure, not shares. Not available to US persons. Can lose money."
  - "Built on Base, not by Base."

---

## Ranking: virality potential vs effort

Virality and effort are scored 1–5. Ranked by virality ÷ effort, with a tiebreak for quest value (build-in-public score + onchain traction).

| Rank | # | Concept | Virality | Effort | Quest value | Make by |
|---|---|---|---|---|---|---|
| 1 | 2 | **"Filed 45 days late"**: story basket hook | 5 | 2 | High (drives buys) | Nov 24 |
| 2 | 6 | **"Picking tickers vs picking a story"**: two-panel type meme | 4 | 1 | Med | Nov 22 |
| 3 | 7 | **Founder clip: "Stock tokens on Base aren't contracts"** | 4 | 1 | **Very high** (build-in-public) | Nov 20 |
| 4 | 4 | **"Did followers win too?"**: honesty angle | 4 | 2 | High | Nov 27 |
| 5 | 1 | **"STORIES, NOT SYMBOLS"**: 18s cinematic teaser | 4 | 3 | Med | Nov 21 |
| 6 | 9 | **"Sorry, America"**: who it's for | 4 | 1 | Med | Nov 26 |
| 7 | 3 | **"Drift, then trim"**: 30s explainer | 3 | 2 | Med | Nov 29 |
| 8 | 8 | **"Exit's always open"**: in-kind withdraw proof | 3 | 1 | Med | Dec 1 |
| 9 | 10 | **"Bottle your thesis"**: creator recruitment | 3 | 2 | **High** (creates baskets) | Dec 2 |
| 10 | 5 | **Quest demo** (≤2:15, tags @buildonbase) | 3 (judges matter more) | 4 | **Required** | Dec 3 draft, post Dec 4 |

**If you only have 3 days of editing:** make #7, #2 and #5 (the demo, which is required). Everything else is a bonus.

---

## 1. "STORIES, NOT SYMBOLS": cinematic teaser (requirement a)

- **Format:** 18 s. Master in 1:1 (1080×1080) and export a 9:16 cut. Muted autoplay works, so type carries everything.
- **Hook (0–2 s):** Hard cut from black to a ticker wall flickering fast, uppercase Anton, off-white on black: `NVDA MSFT GOOGL TSLA AAPL AMZN META AVGO…`
  - The on-screen kicker, top left in small Inter: **"you're not here for tickers."**

**Storyboard**

| Time | Picture | On-screen text |
|---|---|---|
| 0.0–2.0 | Ticker wall, rapid flicker, slight camera shake | top-left small: *you're not here for tickers.* |
| 2.0–4.5 | Tickers dissolve into **white smoke** that drifts left to right | — |
| 4.5–8.0 | Smoke clears to a giant outlined Anton **ALLOY** drifting slowly left, with the sapphire AI Build-Out cover fading in behind it at 30% | Vertical rail, right edge: **ALLOY** |
| 8.0–11.0 | **Burgundy silk** falls across the lower third (the only burgundy in the video) | Big centre, 3 words per beat: **INVEST IN / STORIES,** |
| 11.0–13.5 | Silk slides off. Black. | **NOT SYMBOLS.** |
| 13.5–16.0 | 3 basket "recipe cards" slide in, stacked (Figma), names only: THE AI BUILD-OUT · CAPITOL TECH · PICKS & SHOVELS | small: *baskets of tokenized US stocks* |
| 16.0–18.0 | End card | **ALLOY** · *Dec 4* · @alloy_fi |

- **Visual direction:**
  - Silk is a texture shot (stock, or Midjourney still → Kling/Veo image-to-video, 5 s takes). Smoke is stock footage, or a CapCut overlay in "screen" blend mode. Basket covers come from the IMAGERY.md set. No characters.
  - Grain overlay at 6%. Everything stays monochrome except the silk.
- **Sound:** One low sub hit at 0.0. A ticking clock or tape-machine chatter under the tickers (0–2 s), then a sudden **silence** at 4.5 s while the smoke clears. A single deep piano note on "NOT SYMBOLS." Use royalty-free (Artlist/Epidemic) or a CapCut library track.
- **Caption (X post):**
  > Tickers are noise. Stories are why you buy.
  >
  > Alloy: baskets of tokenized US stocks, built around one idea each. Dec 4.

  First reply: "Want in before launch? Reply with the story you'd turn into a basket. We'll build the best one live." Then the compliance footer and "AI-assisted visuals."
- **Effort:** 1 day. A couple of hours on silk/smoke texture takes, the rest in CapCut/AE on type.
- **Compliance:** No returns, no logos. Tickers are plain text. AI visuals credited. ✅

---

## 2. "Filed 45 days late": compliant story basket hook (requirement b)

**Idea:** The famous hook is "copy Pelosi". We do the honest version. **US lawmakers must disclose stock trades, but the filing can come up to 45 days after the trade** (STOCK Act). So the story isn't "copy them and win". It's "here's what the public record says, bundled, dated, and clear about the lag." That honesty is the hook, because everyone on X already knows the Pelosi meme.

- **Format:** 25 s, 1:1. Screen capture of the real basket page plus type cards.
- **Hook (0–2 s):** A white, slightly crumpled document fills the frame (stylised and fake: a "PERIODIC TRANSACTION REPORT" header, all names redacted with black bars). A huge red-ink stamp slams down: **"FILED 45 DAYS LATER."**
  - Caption: **"Congress trades stocks. You find out up to 45 days later."**

**Storyboard**

| Time | Picture | On-screen text |
|---|---|---|
| 0–2 | Redacted filing, stamp slams | **FILED 45 DAYS LATER.** |
| 2–5 | Zoom into the line items: tickers only, the rest redacted | *It's public record. Anyone can read it.* |
| 5–9 | Tickers lift off the paper and stack into a basket card: **CAPITOL TECH** | *So we bundled the tech stocks that show up most.* |
| 9–14 | Screen recording: Capitol Tech basket page. Scroll to the story line, highlighted | *"Built from public disclosures dated {Aug 14, 2026}. Nobody named is involved."* |
| 14–19 | Tap **Buy $5** → confirm sheet → done check (real Base Sepolia) | *$5. One token. The whole basket.* |
| 19–23 | The Capitol Tech cover (burgundy dome art) fills the frame; the filing date underlines itself in accent | *We show the filing date. We don't promise you their returns.* |
| 23–25 | End card | **ALLOY** · link in reply |

- **Visual direction:** Off-white paper on black is the only bright surface. The stamp is accent #C41A42 ink (small area). Use Anton for the stamp and Inter for the line items. **No photo, name, or likeness of any politician.** Don't name Pelosi in the video. Let the audience make the connection.
- **Sound:** Paper rustle, then a hard **stamp thud** at 0.8 s (the hook lives on this sound for the ~20% watching with audio). A low bassline loop after that.
- **Caption:**
  > Congress has to disclose stock trades. Up to 45 days after the fact.
  >
  > We turned the public filings into a basket. Filing date on the page. Nobody named is involved. No promises it beats anything.
  >
  > Capitol Tech, live on testnet. $5 to try.

  First reply: the link plus "Built from public disclosures. Not affiliated with any member of Congress. Tokenized stock exposure, not shares. Not for US persons."
- **Effort:** 1 day. Figma paper and stamp, After Effects stamp shake, a screen recording.
- **Compliance check:**
  - No endorsement implied: the "Nobody named is involved" line is in the video.
  - The disclosure date is shown.
  - No performance claims. Don't show NANC returns.
  - No likeness.
  - The 45-day figure is the legal maximum. Phrase it as "**up to** 45 days", which is accurate.
  - The redacted document is clearly stylised, not a forged real filing. Use a fake layout, no real signatures, and "illustration" in small type. ✅

---

## 3. "Drift, then trim": rebalance explainer in 30 s (requirement c)

- **Format:** 30 s, 1:1. A Figma/AE animated diagram, reusing the "sticky storytelling" visual from MOTION.md §5.2.
- **Hook (0–2 s):** Three bars at exactly 40 / 30 / 30. A jade arrow yanks the first bar to **58%**.
  - Text: **"Your basket was 40% NVDA. Now it's 58%. You didn't do anything."**

**Storyboard**

| Time | Picture | On-screen text |
|---|---|---|
| 0–3 | 40/30/30 bars, then NVDA shoots to 58 | *Your basket was 40% NVDA. Now it's 58%.* |
| 3–8 | Bars labelled with $: $40 → $87 / $30 / $30 (small numeric example) | *Winners grow. Your "balanced" basket quietly isn't.* |
| 8–13 | A dotted target band (35–45%) appears around bar 1. The bar is outside it, so it pulses accent | *That's drift.* |
| 13–20 | A "trim" animation: a slice of bar 1 moves into bars 2 and 3, and they settle back inside their bands | *Alloy trims it back to the recipe. You don't lift a finger.* |
| 20–25 | Rebalance feed card (real UI): "Trimmed NVDA 58%→40%. Cost $0.41 (0.14%). Reason: drift." | *Every trim comes with a reason and a cost.* |
| 25–28 | Mode chips: **Balanced · Let Winners Run · Trend-aware** | *Creators pick how strict.* |
| 28–30 | End card | **ALLOY** · *We rebalance. You watch.* |

- **Visual direction:** Bars in off-white. The target band is a dotted ink-600 line. The out-of-band pulse is accent #C41A42 (tiny). The gain arrow is jade. The end card is type only.
- **Sound:** A soft tick on each bar move, a satisfying "click into place" when bars land in band. A calm lo-fi bed.
- **Caption:**
  > Drift, explained in 30 seconds.
  >
  > Prices move, your weights move with them. Alloy trims back to the recipe, shows you the cost, and says why.
- **Effort:** 1 day in After Effects, or half a day in Figma Smart Animate plus CapCut.
- **Compliance:** The numbers are an illustrative example. Label "example numbers" in small type. No implication that rebalancing improves returns: say "keeps you on recipe", not "boosts returns". ✅

---

## 4. "Did followers win too?": honesty angle (requirement d)

- **Format:** 20 s, 4:5 (1080×1350). Screenshot-able. The whole video is built around one card.
- **Hook (0–2 s):** Split screen. Left, a generic flex screenshot: "**+212%** 🚀 copy my trades" (made-up, blurred handle). Right is blank. Text: **"Every copy-trading app shows you this number."**

**Storyboard**

| Time | Picture | On-screen text |
|---|---|---|
| 0–2.5 | Fake flex card on the left | *Every copy-trading app shows you this number.* |
| 2.5–5 | The flex card cracks and falls away | *It's the creator's number. Not yours.* |
| 5–11 | Real Alloy card slides in: **Did followers win too?** Followers (avg) **▲ +11.8%** / Creator **▲ +12.4%** | *We show both. Same chart.* |
| 11–15 | Caption line from the card highlights: "Followers trail by 0.6%. That's the fee plus timing." | *And we tell you why they differ.* |
| 15–18 | A second card variant: followers **7.2% behind**. "Most joined after the big run." | *Even when it's ugly.* |
| 18–20 | End card | **NO BLACK BOXES.** · ALLOY |

- **Visual direction:** Mostly black and off-white. The flex card is deliberately garish (rainbow gradient, emoji) so it contrasts with our restraint. Followers and creator numbers are jade with ▲.
- **Sound:** Glass crack at 2.5 s, then quiet. A typewriter tick under the numbers.
- **Caption:**
  > Copy-trading has a dirty secret: the leader's PnL isn't the followers' PnL.
  >
  > Every Alloy basket shows both, on the same chart. If followers are behind, the page says so and says why.

  Reply: "Research on copy trading keeps finding followers take more risk than leaders. We'd rather show you than tell you." Add "Example numbers. Past performance isn't a promise."
- **Effort:** Half a day (Figma cards and CapCut).
- **Compliance:** Mark the numbers as example or testnet. The flex card is fictional, with no real handle. ✅

---

## 5. Quest demo, ≤2:15 (requirement e)

- **Why ≤2:15:** Free X accounts can't upload more than 2:20 (140 s). Either keep it under, or turn on Premium for @alloy_fi before Dec 4. Upload natively. A Loom copy can go in a reply.
- **Format:** 16:9, 1080p. Screen recording (Screen Studio auto-zoom) plus a founder face bubble in the bottom-left corner for the first 10 s and last 10 s. VO with burned-in captions.
- **Hook (0–3 s):** Founder face plus big type: **"One token. Five US stocks. Rebalanced for you. On Base."** VO: "This is Alloy. You buy a whole investing idea with one tap."

**Script**

| Time | Screen | VO (plain, fast) |
|---|---|---|
| 0:00–0:08 | Face cam → landing hero "INVEST IN STORIES, NOT SYMBOLS." | "This is Alloy. Baskets of tokenized US stocks on Base. You buy the idea, not five tickers." |
| 0:08–0:20 | Explore page: The AI Build-Out, Capitol Tech | "Creators build baskets around a story. Each basket is one ERC-20 token that holds Coinbase's B20 stock tokens." |
| 0:20–0:40 | Sign in with Google (Privy) → US-person check → Buy $5 → confirm → done. Show the basescan tx in a new tab for 2 s | "Sign in with Google. No seed phrase. Confirm you're not a US person. Buy five dollars. The router swaps USDC into each stock and mints you a basket token. That's a real transaction on Base Sepolia." |
| 0:40–0:55 | Basket page → "Did followers win too?" card | "Every basket shows how followers did next to how the creator did. If followers are behind, it says so." |
| 0:55–1:15 | Rebalance feed: a drift trim with cost and reason. Then a pending recipe change with a 24h countdown | "Prices drift. Our keeper trims back to the recipe. The contract checks the market's open, the price feeds are healthy, the loss is capped, and weights land in band. All or nothing. Recipe changes wait 24 hours, so you can leave first." |
| 1:15–1:30 | Sell 30% → USDC. Then "Withdraw stocks" → the actual stock tokens land in the wallet | "Sell any percent, any time. Or pull out the actual stock tokens. Your exit never depends on us." |
| 1:30–1:50 | Create basket: pick 4 stocks, weights, mode "Balanced", seed $10 → share card | "Anyone can make a basket. Pick up to ten stocks, choose a strategy, seed it. You earn one percent a year on what follows you." |
| 1:50–2:05 | Quick montage: contracts in Foundry tests passing, Ponder indexer logs, "what we built since Nov 13" checklist | "Built during Stocks Maxxing: basket vault contracts, the USDC router, Chainlink rebalance guards, and the whole app. Testnet today, small mainnet proof with real stock tokens." |
| 2:05–2:15 | Face cam + end card: alloy link · @alloy_fi · footer | "Try it on testnet, make a basket, tell us what breaks. Built on Base, not by Base." |

- **Visual direction:** The real app in dark mode. Zoom-ins on numbers. Text callouts in Anton on black bars at the top. **No Base logo** on screen. If the Base Sepolia name appears in the wallet UI that's fine (it's factual), but don't add Base branding.
- **Sound:** Quiet lo-fi bed at -24 LUFS under the VO. Record the VO with a lav or AirPods in a closet. Don't use AI voice; judges and crypto X notice.
- **Caption (submission post):**
  > Alloy: buy a whole investing idea with one token.
  >
  > Creator-made baskets of tokenized US stocks on Base. $5 in, rebalanced for you, followers' PnL shown next to the creator's, and you can always pull out the actual stock tokens.
  >
  > Built for Stocks Maxxing Season @buildonbase. Track: Programmable Stock Markets.
  >
  > Testnet is live, link below. Make a basket and break it.

  Reply 1: link, testnet faucet note and compliance footer. Reply 2: "What we built since Nov 13", 6 bullets plus the GitHub link. Reply 3: tag the feel.cash panel only if it ships, phrased as "feel.cash coins shown read-only".
- **Effort:** 1.5–2 days, including 2–3 full rehearsal takes. **Record on Dec 2–3** so a broken flow can be fixed before Dec 4.
- **Compliance:**
  - Says "testnet" on screen.
  - "Coinbase's B20 stock tokens" is a factual description, not an endorsement. Never say "partnered".
  - "Tokenized stock exposure" appears in the footer.
  - No returns promised.
  - It tags @buildonbase as required.
  - Don't say "the AI decides". If AI proposals are shown, add the label "AI-suggested, creator approves". ✅

---

## 6. "Picking tickers vs picking a story": two-panel type meme (requirement f)

- **Format:** 8–10 s loop, 1:1. The classic two-panel "no / yes" structure, rebuilt with our own type and screens so it's on-brand and not a stolen template. No characters.
- **Hook (0–2 s):** Panel 1: a chaotic 47-tab spreadsheet titled "my_portfolio_FINAL_v9.xlsx" gets a slow vermilion strike-through.

**Storyboard**

| Time | Picture | Text |
|---|---|---|
| 0–4 | The spreadsheet chaos, struck through | **RESEARCHING 9 TICKERS AT 2AM IST** |
| 4–8 | A single basket card slides in with its sapphire cover: "THE AI BUILD-OUT · $5" | **BUYING THE WHOLE IDEA** |
| 8–10 | Hold, then loop | small: alloy |

- **Variants** (same two panels with new text, so one Figma session gives 5 posts):
  - "Checking if the US market's open from Lagos" / "Buying anyway, it's 24/7 onchain"
  - "Copy-trading a guy with +212% in his bio" / "Checking if his followers made money too"
  - "Rebalancing manually" / "Reading the one-line reason"
  - "Picking stocks" / "Picking a story"
- **Visual direction:** Black background, two Anton text bands, the screen panel centred. Burgundy only as a thin border.
- **Sound:** None needed. Optionally use a trending X sound if one is running that week (check the Explore tab the morning you post).
- **Caption:** "standards." (lowercase, that's it). First reply: "alloy, baskets of tokenized US stocks. dec 4."
- **Effort:** 1–2 hours (one screen capture plus Figma).
- **Compliance:** Humour only, no claims. The "24/7" variant must keep "prices can be wider when the US market's closed" in the reply. ✅

---

## 7. Founder build-in-public clip (requirement g)

**"Stock tokens on Base aren't contracts. Our tests broke."** This is a true story from the build: B20 tokens are precompiles (`eth_getCode` returns `0xef`), so stock Foundry couldn't run them and we had to use base-forge/base-anvil.

- **Format:** 45–60 s, 9:16. Founder face to camera (phone on a stack of books, window light), with the terminal shown as picture-in-picture cutaways.
- **Hook (0–2 s):** The founder is already mid-sentence: **"I spent a day debugging a stock that isn't there."** On-screen: the terminal output `getCode → 0xef`.

**Script**

| Time | Picture | Line |
|---|---|---|
| 0–3 | Face, then a smash cut to the terminal | "I spent a day debugging a stock that isn't there." |
| 3–12 | Face | "Coinbase's tokenized stocks on Base, the B20 ones, aren't normal contracts. They're built into the chain. Ask for their code and you get two bytes." |
| 12–22 | Terminal: forge tests failing in red, then base-forge passing in green | "So normal Foundry can't see them, and all our basket tests failed. Fix: Base's own fork of the tools. Tests green." |
| 22–35 | Screen: basket contract, issue and redeem test names | "Why care? Alloy is a basket token that holds those stocks. If the tests are wrong, your basket's wrong." |
| 35–45 | Face | "Day 8 of building Alloy for Stocks Maxxing. Tomorrow: the rebalance guard. Ask me anything about B20 in the replies." |

- **Visual direction:** Raw is fine and actually better. Add a small Anton day counter in the top-left ("DAY 08"), the same every episode. Burned-in captions, word by word (CapCut auto-captions, then fix any errors by hand).
- **Sound:** Natural voice, no music, or a very low bed.
- **Caption:**
  > Day 8 building Alloy.
  >
  > B20 stock tokens on Base are precompiles. eth_getCode returns 0xef. Stock Foundry can't run them, so every basket test failed.
  >
  > Fix + what I learned ↓
  >
  > #StocksMaxxing

  Write a 4-post thread under it with the exact commands. Builders bookmark these.
- **Effort:** 1 hour. **Make one of these every 2 days** (Day 8, 10, 12…). This series is what the "built in public" score and the $6k prize are judged on.
- **Compliance:** Factual technical description. "Coinbase's tokenized stocks" is descriptive. Don't say "we work with Coinbase". ✅

---

## 8. "Exit's always open": in-kind withdraw proof

- **Format:** 12 s, 9:16. Mobile screen recording, one continuous take, no cuts. The lack of cuts is the proof.
- **Hook (0–2 s):** Text over the basket page: **"What if the app disappears tomorrow?"**

| Time | Picture | Text |
|---|---|---|
| 0–2 | Basket page | *What if the app disappears tomorrow?* |
| 2–8 | Tap "Withdraw stocks" → confirm → wallet shows 4 stock tokens arriving | *You take the actual stock tokens with you.* |
| 8–12 | A basescan tab with the tx | *Onchain. Not an IOU.* · ALLOY |

- **Caption:**
  > Every basket on Alloy lets you pull out the actual stock tokens. Market open or closed. One tap, no cuts in this video.
  >
  > Testnet tx in reply.
- **Effort:** 1 hour.
- **Compliance:** Say "stock tokens", not "shares". The tx link is in the reply. ✅

---

## 9. "Sorry, America": who it's for

- **Format:** 10 s, 1:1. Type only.
- **Hook (0–2 s):** **"US STOCKS. NOT FOR US PERSONS."**

| Time | Text (Anton, one line per beat) |
|---|---|
| 0–2 | **US STOCKS.** / **NOT FOR US PERSONS.** |
| 2–5 | *Built for Mumbai, Lagos, São Paulo, Manila, Nairobi, Jakarta.* (city names scroll down a vertical rail) |
| 5–8 | *$5 minimum. Sign in with Google.* |
| 8–10 | One burgundy silk ribbon passes behind · **ALLOY** |

- **Caption:**
  > Rare W for the rest of the world.
  >
  > Alloy: baskets of tokenized US stocks for people outside the US. $5 minimum. Dec 4.
  >
  > (US friends: this one's not for you, legally. We checked.)

  Reply: "Tell us your city. We're picking which local on-ramp to add first."
  - This doubles as research and drives replies, which carry big ranking weight.
- **Effort:** 2 hours.
- **Compliance:** It *states* the restriction, so it's compliant by design. Don't joke about getting around it (no "use a VPN" replies, and delete or answer any that appear with the rule). ✅

---

## 10. "Bottle your thesis": creator recruitment

- **Format:** 20 s, 4:5. A real screen recording of creating a basket, sped up 4×.
- **Hook (0–2 s):** **"You've been right about a stock. Got paid zero for it."**

| Time | Picture | Text |
|---|---|---|
| 0–2 | Black, type | *You've been right about a stock. Got paid zero for it.* |
| 2–12 | Create flow at 4×: pick stocks → weights → mode → seed $10 → share card with a smoke fade (the one allowed celebration) | *Pick up to 10 stocks. Set weights. Seed $10.* |
| 12–17 | Creator dashboard: "You earned $2.14 this week from 212 followers" (example) | *Earn 1% a year on everything that follows you.* |
| 17–20 | **GOT A THESIS? BOTTLE IT.** | ALLOY |

- **Caption:**
  > Got a thesis? Bottle it.
  >
  > Make a basket on Alloy, put your own money in, earn 1%/yr from followers. Your followers' PnL sits next to yours, so be good.
  >
  > First 50 creators on testnet get a Founding Creator badge.
- **Effort:** Half a day.
- **Compliance:** The fee is a creator fee, not an investment return to the user. Mark the dashboard numbers as example. The badge is cosmetic: no token, no money, no promise of an airdrop. ✅

---

## Production plan (1 founder, ~2 hrs/day on video)

| Day | Make |
|---|---|
| Nov 20 | #7 Day-8 founder clip (1 h). Generate the silk and smoke texture takes in one batch. |
| Nov 21 | #1 teaser edit |
| Nov 22 | #6 meme (3 variants from the same two panels) |
| Nov 23–24 | #2 story basket hook (needs the Capitol Tech page on testnet) |
| Nov 25–26 | #9, plus founder clip Day 13 |
| Nov 27 | #4 followers vs creator |
| Nov 29 | #3 drift explainer |
| Dec 1 | #8 withdraw proof |
| Dec 2 | #10 creator video. Dry-run the demo. |
| Dec 3 | **Record and edit #5 demo** |
| Dec 4 | Post #5 and submit the form |
