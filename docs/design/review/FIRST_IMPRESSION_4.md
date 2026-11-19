# First impression #4: fresh eyes, browser only

Date: 2026-11-19. Viewed http://localhost:3000 in Playwright at 1440x900 and 390x844. I read no project files. I judged only what the browser showed.
Screenshots: `/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/fresh4/shots/` (`d*` = desktop, `m*` = phone).

---

## 1. 5-second test: what is this?

"BUY THE WHOLE AI STORY." plus "Baskets of US stocks, built around one idea. From $5." I get it in five seconds: buy a themed bundle of US stocks for a few dollars. The featured card on the right confirms it, with NVDA/MSFT/GOOGL/AMZN, a bar of weights and a Buy $25 button. This is the clearest hero of any version so far.

What slows me down: the copper word in the headline swaps between "AI" and "BIG TECH" while the card behind it rotates and tilts. For a moment two basket titles cross-fade on top of each other (d01b: "The AI Build-Out" over "Big Tech, Trimmed"). My eye goes to the motion, not the message.

## 2. After one minute: in my own words

"Someone (a 'creator') picks 2 to 10 US stocks around a theme and sets the weights. I put in $5 or more and own a slice of each stock in that ratio. The creator also has their own money in it. They can change the mix, but they must tell me a day ahead. I can sell any time for dollars, or take the stock tokens out. It runs on crypto rails (Base), but I never have to touch that."

I could only reach the last sentence by reading the small print, and by guessing from the Test mode menu.

**Confusing words, roughly worst first:**
- **"units" / "Price per unit $1.00" / "You get ≈ 24.91 units of The AI Build-Out"**: a first-time investor has no idea what a unit is. And $1.00 per unit looks like a stock that never moves.
- **"Let winners run"**: this appears as a badge on the basket hero with an (i) icon, and in How-it-works step 4. It reads like a trading slogan, not like a rule.
- **"0.1 pts" / "target 40%" / "on target"** (What's inside): this is portfolio-manager language.
- **"Skin in the game"**: idiomatic English, and it will not translate well for Lagos, Jakarta or São Paulo users.
- **"Conviction Bets"**: a basket name that sounds like gambling.
- **"Base Sepolia · testnet", "Base · mainnet", "test USDC"** (Test mode menu): pure crypto jargon in the most visible pill on every page.
- **"Continue with a wallet", "I have a passkey", "Twitter"** (Sign in): the site says "X · @alloy_fi" everywhere else, then "Twitter" here.
- **"tokenized exposure", "on-chain basket"** (How your money is held): honest, but it is the first time the product says crypto, and it is buried at the bottom.
- **"Stories"** (Explore filter chip): stories of what? Every basket is a "story" according to the hero.
- **"Recipe"**: cute and consistent, but "recipe changes" next to "fee" in Key stats feels odd.

## 3. Would I trust it with money?

**Not yet with real money. I'd try it with test money.**

What helps:
- Disclosures are everywhere and plain: "Not available in the US. You can lose money." sits right under the CTAs, and "You own a token that tracks these stocks, not the shares themselves" is in the footer. That's unusually honest.
- The "How your money is held" card is excellent: four short lines, written as a human would say them.
- The fee is stated as "1% a year, nothing else", and the trading cost (≈ $0.03) is shown before you buy.
- "Creator has $1.0k in it" and "Changes announced a day early" are real trust mechanics, not decoration.
- The buy flow refuses $3 gracefully: "Enter $5 or more", and the button turns into "Minimum is $5". No error-red, no shouting.

What hurts:
- **Every basket is by @alloy_fi, the house account.** "Most followed" baskets show no follower counts. "Creator's own money $1.0k" equals "In basket $1.0k" ("99% of basket"). Nobody else has bought in. The social-proof sections ("Did followers win too?") are empty-state placeholders.
- **Numbers disagree with each other.** In How-it-works step 3, desktop says "NVDA rose 45%, so your $25 is now $29.52" and phone says "NVDA rose 50%… now $30". Step 4 then shows $30 on desktop. Step 2's title says "Start with $5", but the visual shows $25. On a money product, careless numbers read as careless custody.
- **"Since Nov 19 0.0%"** on two of three Explore cards (Nov 19 is today), and a flat chart on the basket page labelled 1M. This looks dead, not new.
- The Test mode pill, crypto network names and "Protected by privy" make it feel like a dev build of a crypto app, not a brokerage.
- The brand mark is a **crimson-red** square, and the "Featured basket" badge is red. On a money screen, red means loss.

## 4. Visual gut reaction

- **Premium?** Mostly yes. The dark warm-black base, condensed poster headline, oxblood cover art and cream allocation bars feel considered, more Pendle/Morpho than meme-coin. The basket page is the best screen: calm, roomy, clear hierarchy.
- **Cluttered?** Not cluttered, but **repetitive**. The home page shows "$5 / 1% / Anytime" three times within one screen: the hero card stats, the stats row, and the trust strip ("Exit anytime · Fee 1% a year, nothing else"). The NVDA/MSFT/GOOGL/AMZN 40/25/20/15 recipe appears about five times on the home page: How-it-works (four times), Live baskets, and the "Your recipe" card in Build-a-basket.
- **Empty?** The Explore page has three baskets, plus filter chips (All / AI / Stories), a sort toggle (Popular / New) and a search box. That's more controls than content. The desktop basket page has a long empty right column under Key stats, because the buy panel is not sticky.
- **Generic?** The How-it-works / Nothing hidden / Build-a-basket sections use the standard SaaS pattern of three icons in a row plus a card. They're competent, but not memorable.
- **One brand?** Mostly. The headline's condensed all-caps display face is used **only** in the hero. Every other heading is a regular grotesk ("How it works", "Live baskets", "Explore baskets"). So the hero feels like it belongs to a different, louder brand than the rest.

## 5. Colour and typography

- **Palette feeling:** warm, serious, a bit nocturnal. It reads as burgundy leather and copper: luxe, adult, not casino. Good fit for "premium".
- **Wrong signals:**
  - **Crimson logo and "Featured basket" pill** sit next to green gains and red losses ("▼ 0.1 pts" in red). The brand red competes with the loss red.
  - **Copper is used for Buy, for the hero highlight word, *and* for the "I have a passkey" link in Sign in.** If copper means "money action", don't spend it on a passkey link.
  - The green on "$29.52 / $30" in How-it-works is bright mint against warm brown. It's the one colour that feels like a different palette (crypto-terminal green).
  - The tiny blue dot in the Test mode pill is the only blue on the site, apart from the Base logo.
- **Numbers:** big prices ($1.00, $25, $30) are crisp, tabular and easy. Small numbers suffer. The "Since Nov 19 0.0%" grey on dark-brown chips, the AAPL 25% legend text, and the trust-strip copy are low contrast, roughly mid-grey on near-black. The "≈" prefixes in the buy sheet ("≈ 24.91 units", "≈ $0.03") add noise.
- **Type:** the condensed poster face in the hero is striking but SHOUTY. All caps in three lines with a period is a lot for a "calm investing" product. The body grotesk is clean and readable.

## 6. Desktop vs phone problems, and anything broken

**Phone (390x844):**
- **Live baskets carousel starts scrolled 16px** (scrollLeft = 16 on load). The first card sits flush against the left screen edge, while the "Live baskets" heading has a 16px gutter (m10). It looks misaligned and cropped.
- **Two stacked bottom bars** on the basket page: the "From $5 · Buy" bar plus the tab bar take about 120px. With the header and the market-closed banner (about 100px), only about 620 of 844px is content.
- **Fee and Key stats are at the very bottom** of the phone basket page, after Details. On desktop they sit right beside Buy. A first-timer on a phone has to scroll the whole page to see what it costs to hold.
- The **Test mode dropdown** opens flush to the left screen edge (x ≈ 2px) instead of under the pill (m20).
- The phone buy sheet loses the "min $5" hint that desktop shows in the sheet header.
- The How-it-works steps stack well on phone. It's actually easier to follow there than on desktop.

**Desktop (1440x900):**
- **How-it-works pacing:** step 1 stays on screen for about 1,600px of scroll with nothing changing (d02 and d03 are identical). Then steps 2, 3 and 4 fly by. It feels stuck, then rushed.
- **Step 4 visual is hard to read.** "NVDA stays at 50%. It only sells if one stock passes 60%." The 60% tick sits on a bar of dollar values ($15.00). So I'm comparing a percentage marker against a bar labelled in dollars.
- The **hero card animates and tilts while you're aiming at "Buy $25"**: a moving target. Clicking it went to whichever basket was showing, after a full skeleton screen (d20).
- The basket page **logo stack** (NVDA/MSFT/GOOGL/AMZN icons next to the creator) overlaps so tightly that the Google "G" covers the Microsoft logo.
- "+0.2%" appears twice in the price card (top right "since Nov 19", and again under the price).
- The non-sticky buy panel leaves about 1,200px of empty right column.

**Both:**
- Console: **`/favicon.ico` 404**. Also a FocusTrap warning, "no focusable elements" (a modal opened before its content was ready), and an LCP warning for `/brand/covers/big-tech-800.webp` (above-the-fold hero cover is lazy-loaded).
- The Next.js dev "N" badge overlaps the "Explore" tab on phone. It's dev-only, so ignore it, but it hides real overlap testing.
- No layout overflow: scrollWidth equals the viewport on both sizes.

## 7. Scores

| | /10 |
|---|---|
| Clarity | **7.5**: the hero and buy sheet are clear; "units", "pts", "Let winners run" and the crypto menu cost points |
| Trust | **5.5**: excellent disclosures, but one house creator, no followers, and numbers that disagree |
| Visual polish | **7.5**: a premium palette and a strong basket page; repetition, the hero-only display font and a red logo hold it back |
| Mobile | **6.5**: good stacking, but the carousel gutter bug, double bottom bar and buried fees |

## 8. Top 10 fixes, most important first

1. **Make every example number agree.** In How-it-works, step 2 should say "Start with $25" or show $5. Steps 3 and 4 must use the same figures on desktop and phone (pick 50% → $30 everywhere). Anyone checking the maths should never catch you out.
2. **Kill "units" on the buy sheet and cards.** Show "You get: $10.00 NVIDIA · $6.25 Microsoft · $5.00 Alphabet · $3.75 Amazon" (you already have this visual in How-it-works step 2). Show basket performance as a % instead of "Price per unit $1.00".
3. **Stop the hero card rotating and tilting** (or at least freeze it on hover or focus). Pin one featured basket so "Buy $25" is a steady target, and the headline word always matches the card.
4. **Fix the phone Live baskets carousel**: start at scrollLeft 0 with a 16px leading inset.
5. **Hide crypto plumbing from the Test mode pill.** Say "Practice mode · prices are real, money is pretend", and put network names behind an "Advanced" link. In Sign in, rename "Twitter" to "X". Demote "Continue with a wallet" and the copper "I have a passkey" link to plain grey.
6. **Show social proof honestly, or don't promise it.** Remove "Most followed" until there are follower counts, and collapse "Did followers win too?" into one line until there's data. Get at least one non-house creator before launch.
7. **Pull fees up on phone**: put a one-line "1% a year · ~$0.25 on $25" under the price on the basket page, not in Key stats at the bottom. Show the yearly fee in dollars on the buy sheet too.
8. **Recolour the logo mark and "Featured" badge** away from loss-red (use copper or cream), and tone the mint gain-green warmer so it belongs to the palette.
9. **Rename the jargon**: "Let winners run" → "Rebalances only if one stock passes 60%"; "0.1 pts" → "+0.1% vs plan"; "Skin in the game" → "Creator's own money"; "Conviction Bets" → a plain theme name.
10. **Tighten the home page**: show $5 / 1% / Anytime once, not three times. Even out the How-it-works scroll pacing (equal scroll per step). Make the desktop buy panel sticky. Add `/favicon.ico` and eager-load the hero cover image.
