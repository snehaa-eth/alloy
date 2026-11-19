# First impression #3: fresh eyes, browser only

Reviewer: a product designer who has never seen Alloy. I read no code or docs.
Brief I was given: "Alloy: themed baskets of US stocks anyone can buy from $5, for first-time investors in India, Africa, Latin America and Southeast Asia."
Viewports: 1440x900 and 390x844, on http://localhost:3000, signed out.
Screenshots: `/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/fresh3/shots/` (`d-*` = desktop, `m-*` = phone).

---

## 1. Five-second test

"BUY THE WHOLE AI STORY." plus "Baskets of US stocks, built around one idea. From $5." plus a card with stock logos and a copper "Buy $25" button.
**I got it in five seconds:** you buy a themed group of US stocks in one go, starting small. That is a pass. The headline does its job.

What I did *not* get in five seconds: who built the basket (the "@alloy_fi" and "Creator has $998 in it" lines mean nothing yet), or that this is a test version with fake money. Nothing above the fold says "test".

## 2. After one minute, in my own words

"Alloy lets me put a few dollars into a ready-made group of US stocks around one theme, like AI or big tech. Someone (a 'creator') picks the stocks and the split, puts their own money in, and the basket mostly runs itself. I can sell any time. It costs 1% a year. I get 'tokenized exposure', not real shares, and I can't use it if I live in the US."

That is pretty close to the brief. The "How it works" section in four steps is the best part of the site.

**Confusing words or ideas (from a first-time investor's view):**
- **"Tokenized stock exposure, not shares"**: the most important legal fact, and it is written in the hardest words on the site. A new investor will ask, "So do I own Apple or not?"
- **"Basket share" / "≈ 24.91 shares" / "$1.00 per share"**: How it works step 2 says "You get **one** basket share that holds all of it", but the buy sheet says $25 gets you **24.91 shares**. These two contradict each other.
- **"Let winners run" / "Ride the trend" / "Keep the mix"** (How it works step 4 and the basket hero tag): three strategy names appear with no explanation for two of them. They read like a menu I am meant to choose from, but I can't.
- **"takes over"** (tiny label on the step 4 bar): unclear and very small.
- **"pts"** ("▲ 0.1 pts" in What's inside): finance jargon.
- **"Skin in the game"**: an idiom that won't land with many people for whom English is a second language.
- **"Fills can differ from value"** (buy sheet warning): trader jargon.
- **"Once every 24h per address"** (Add test money): "address" means a crypto wallet address. A first-timer won't know that.
- **"Continue with a wallet"**, **"I have a passkey"** (Sign in): fine for crypto users, puzzling for the target user.
- **"Your basket, your keys"** (trust strip on home): crypto slang.
- **"Stories"** filter chip on Explore: every basket is a "story", so what does this filter do?
- **"Recipe"**: a nice metaphor, but it is used next to "basket", "mix", "plan" and "weights". That is too many words for one thing.
- **"Me"** tab: odd next to Portfolio. "Profile" or "Account" would be clearer.

## 3. Would I trust it with money?

**Today: with $5 of curiosity money, maybe. With real savings, no.** It looks more trustworthy than most crypto sites, but it still feels like a demo.

**What helps**
- The calm, dark, editorial look. No neon, no rockets, no "100x".
- The fees are stated plainly and repeated: "1% a year, nothing else", trading cost "≈ $0.03".
- "You can lose money" and "Not available in the US" sit right under the hero buttons. That is honest.
- "Creator has $1.0k in it" and "Changes announced a day early" are strong trust ideas.
- The "How your money is held" card is a good idea.
- The buy panel shows exactly what you get before you sign in.

**What hurts**
- **Every basket is made by the same account (@alloy_fi), with about $1k in each.** "Live baskets · Most followed" shows three baskets with no followers at all. "Creator's own money $1.0k" equals "In basket $1.0k", which is 99% of the basket. It looks empty, and that reads as "nobody uses this".
- **The chart is misleading.** On the basket page, a +0.2% move fills the whole chart height as a big green ramp. To a beginner it looks like the basket shot up.
- **No returns anywhere on Explore.** The footer says "Returns shown are past, not promised", yet no returns are shown. I can't compare baskets on anything except their stocks.
- **Test money is hidden.** "Test dollars, not real money" is 11px grey text under the Buy button. If this is a testnet, it should be impossible to miss. If it is not, the "Add test money" link confuses people.
- **The sign-in modal says "Protected by privy"** with a wallet and passkey option. That is fine, but nothing tells me who holds my money or how I cash out to my local bank. That is the #1 question for a user in India, Nigeria or Brazil.
- **There is no local currency, no deposit method and no "how do I get dollars in" story.** For the target markets this is the biggest gap.
- **The favicon is a 404** (the browser tab shows a blank icon). It is small, but it makes the site feel unfinished.

## 4. Visual gut reaction

- **Premium?** Mostly yes. It reads like a dark-mode fintech with an editorial feel ("Robinhood at night"). The condensed all-caps hero font is bold and confident.
- **Cluttered?** The home page is not. The basket page is a bit: five stacked cards (price, followers, skin in the game, what's inside, what changed, details) plus the Key stats card, which repeats the fee and the creator stake that are already shown above.
- **Empty?** Yes, in places. Explore has three baskets and a "Build your own" tile, with a big dead area to the right of that tile on desktop. "Did followers win too?" and "What changed and why" are both empty-state cards on the only basket page. The Me, Portfolio and Activity pages are almost blank when signed out, and "Me" is left-offset (x≈392) instead of aligned to the page grid (x=152) like every other page.
- **Generic?** The basket artwork (red sci-fi corridors, a ringed planet, a circuit chip) looks like AI-generated stock art. It is moody, but it says nothing about "AI Build-Out" or "Big Tech" that a stock logo row doesn't say better. All three images share the same red tint, so the baskets blur together.
- **One brand?** Mostly yes. The oxblood, copper and cream palette is used consistently across home, Explore, basket and sign-in, and the Privy modal is branded to match. Two things break it: the hero headline font is used **only** in the hero and nowhere else, so it feels pasted on; and the header changes between pages ("Launch app" on home, missing on Explore and the basket page).

## 5. Colour and typography

**What the palette makes me feel:** wine, leather, a private-bank lounge. Warm, serious, a bit luxurious. It does not feel like crypto. Good.

**Colours that send the wrong signal on a money screen**
- **Oxblood red is the brand colour, and red means "loss" in finance.** Every allocation bar (home card, Explore cards, What's inside, How it works) is a row of red segments. The **selected** amount chip in the buy sheet ($25) is filled dark red with a red-copper border, so it looks like an error or "danger" state. On a screen where the next tap spends money, red equals "stop". Then on the same basket page, real losses are shown in a **different** red ("▼ 0.1 pts" in What's inside). Two reds, two meanings, side by side.
- **Gold** is used for "Creator has $998 in it" and "Skin in the game $1.0k". Gold reads as "gain" or "premium", which is fine, but it is a third accent next to copper and red.
- **Copper buttons** (Buy, Explore baskets, Sign in) are good. They are distinct from both green and red. Keep them.
- **Green** is used only for price-up and the "live" dot. That is correct.
- The yellow "US market closed" warning box in the buy sheet adds a fourth accent.

**Typography and numbers**
- The body font is clean and readable. The numbers ($25, $1.00, 40.1%) are clear and tabular enough. The big "$25" in the buy panel is great.
- The hero font (condensed all-caps) is striking but only appears once. On phone it is fine.
- A lot of text is too small and too grey for a money product: "Test dollars, not real money" (about 11px), the "takes over" label (about 9px), "min $5", "Past performance isn't a promise", "Fees included. Past, not promised." Disclaimers and test-mode labels are exactly what should *not* be tiny.
- On Explore and home cards, "Fee: 1% a year" and "Minimum: $5" each take a big tile, but they are the same on every basket. That spends the card's best space on information that never changes.

## 6. Desktop vs phone, and anything broken

**Broken or glitchy**
1. **Hero headline layout jump (desktop).** While the rotating word changes, "AI" and "BIG TECH" stack on top of each other, "BIG TECH" is clipped in half, and "STORY." jumps sideways (caught in `d-home-hero.png`). Once settled it looks right, but the first frame I saw was broken.
2. **How it works on phone: broken-looking thumbnails** (`m-home-02.png`, `m-hiw-thumb-zoom.png`). The three basket images are squashed into tiny overlapping blobs with no names. They look like a rendering error.
3. **How it works on phone hides most of the demo.** Step 1 shows only NVDA and MSFT, and steps 3 and 4 show only NVDA. The point ("one stock becomes a bigger slice") gets lost without the other rows shrinking.
4. **How it works logic bug (both sizes).** In step 3, "Prices move": NVDA rises from 40% to 54%, yet the basket value stays **$25**. If a stock went up, the basket should be worth more. A sharp first-time user will notice this, and it undercuts the explanation.
5. **The buy sheet jumps when you type an amount** (`m-buy-3dollars.png`, `m-buy-5dollars.png`, `m-buy-back-to-25.png`). When I typed $3 or $5, the "Trading cost" row disappeared and a yellow "US market closed. Fills can differ from value." box appeared, so the sheet grew taller. A second later the box vanished and Trading cost came back. The warning also never shows for the $10/$25/$100 chips. Is the market closed or not?
6. **Explore loads slowly.** It showed skeleton cards for more than 2.5 seconds on localhost (`d-explore` first capture) for three cards.
7. **Uneven card heights** in "Live baskets" on desktop. Conviction Bets (2 stocks) is shorter than the other cards.
8. **No network or test-mode pill is visible anywhere when signed out**, on desktop or phone. I could not find the network/test pill menu at all (I can't sign in with a real account in this test). If it only appears after sign-in, a signed-out visitor never learns this is test money, except from the tiny line under Buy.
9. **Console:** one error only, a `favicon.ico` 404. No React errors. Good.
10. The Next.js dev "N" badge sits over the bottom-left of every page and overlaps the phone tab bar. It is dev-only, so ignore it unless it ships.

**Desktop-only problems**
- On Explore, the "Build your own" tile sits alone on row 2, with two empty columns of dead space next to it.
- The header changes between pages: home has "Sign in" plus "Launch app", while Explore and the basket page have only "Sign in". "Launch app" itself is odd, because I am *already in* the app (it just goes to /explore).
- Key stats on the basket page (right column) repeats the fee and the creator's stake.

**Phone-only problems**
- The home page has **no nav on phone**: no Explore or Portfolio links and no hamburger, just Sign in and Launch app. Once you go into the app, a bottom tab bar appears. The two halves feel like two different products.
- The basket page stacks two fixed bars at the bottom (Buy bar plus tab bar, about 120px), which leaves little room on an 844px screen.
- The Buy bar shows "**$1.00 per share**". The price of a basket share means nothing to a beginner. "From $5" would sell better.
- In the buy sheet, the "Test dollars" label sits under the dev badge and is half hidden.
- On the plus side, there is no horizontal scroll, the carousel of live baskets snaps nicely, the buy sheet is a proper bottom sheet with large tap targets, and the sign-in modal works well on phone.

## 7. Scores

| | /10 | Why |
|---|---|---|
| Clarity | **7** | The hero and How it works are clear. Points lost for jargon (tokenized, basket share vs 24.91 shares, pts, fills, address) and the $25-that-never-grows demo. |
| Trust | **5** | Honest fees and risk lines, but every basket is the house account with no followers, the chart exaggerates a 0.2% move, there is no cash-in or cash-out story, and test mode is hidden. |
| Visual polish | **7** | A coherent, premium dark palette and nice cards. Points lost for the stock-art images, the hero glitch, empty states, the unaligned "Me" page and the red selected states. |
| Mobile | **6** | The basket page and buy sheet are good. The home How it works is visibly broken on phone, there is no nav on the home page, and the buy sheet jumps. |

## 8. Top 10 fixes, most important first

1. **Make the brand red stop meaning "money at risk".** Change the selected buy chip from red to copper or cream. Draw allocation bars in neutral or copper tints, not shades of loss-red. Keep red only for losses.
2. **Fix How it works on phone.** Show the basket thumbnails at full size with names (or drop them), and show all four stock rows in steps 1, 3 and 4 so the "one stock grows" story works.
3. **Make step 3 honest.** When NVDA rises, the $25 should become about $29. Otherwise the explanation teaches the wrong thing.
4. **Resolve "one basket share" vs "24.91 shares".** Pick one mental model. Either "you own a slice worth $25" or "you get 24.91 shares at $1.00 each", and use it in How it works, the buy sheet and the phone Buy bar. On the Buy bar, show "From $5" instead of "$1.00 per share".
5. **Put test mode in plain sight for signed-out visitors.** Add a visible "Test mode · fake dollars" pill in the header on every page, not 11px grey text under Buy. Make sure the network/test pill exists before sign-in.
6. **Explain "tokenized exposure" in one human sentence** where it first appears, for example "You don't own Apple shares directly; you own a token that tracks their price and can be swapped back." Also add how money gets in and out from a local bank or card. That is the target user's first question.
7. **Fix the chart scale.** Don't let a +0.2% move fill the whole chart. Use a sensible minimum y-range or a flat-looking baseline for tiny moves.
8. **Make Explore feel alive and comparable.** Show a return or "since launch" number on each card. Drop the identical Fee/Minimum tiles from cards and say "All baskets: 1%/yr, from $5" once. Fix the lone "Build your own" tile and the uneven heights. Seed baskets from more than one creator, or label them "Made by Alloy".
9. **Stop the buy sheet jumping.** Reserve space for the Trading cost row. Show the "market closed" note consistently (or not at all) for every amount. Reword it as "US market is closed; your price may differ a little."
10. **Clean up the jargon and the inconsistencies.** Explain or hide "Ride the trend / Keep the mix", and replace "pts", "fills", "address", "Skin in the game" and "Your keys". Use the same header on every page (drop "Launch app" or show it everywhere). Add a nav to the phone home page. Align the "Me" page to the grid. Fix the hero rotating-word jump. Add a favicon.
