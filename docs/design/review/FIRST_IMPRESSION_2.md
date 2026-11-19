# First impression #2: a cold visitor's view

Reviewer: a product designer who came in knowing only "themed baskets of US stocks from $5". No project files were read. Everything below comes from the browser, at localhost:3000 on 2026-11-19, at 1440×900 and 390×844.
Screenshots: `/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/fresh2/shots/` (`d-*` is desktop, `m-*` is phone).

---

## 1. The 5-second test

**"BUY THE WHOLE AI STORY."** + "Baskets of US stocks, built around one idea. From $5."

Yes, I got it in about 3 seconds. The subline does the work. The headline alone ("buy the story") reads like a slogan, not an explanation. The rotating word (AI → TESLA → BIG TECH) helps: within 6 seconds I could see these are themes. "TESLA" is a poor example of a theme, though. It is one company, which makes "basket" feel pointless.

The red "Base Sepolia · testnet" pill sits right next to "Launch app". A non-crypto visitor won't know what Sepolia is. A crypto visitor will immediately think "this is a toy".

## 2. After one minute: what it is, in my words

"Pick a themed basket that someone else has curated, put in $5 or more, and you own one token that tracks several US stocks. The curator rebalances it by a rule, and you can sell anytime for dollars."

That mostly matches the site. Words and labels that confused me:
- **"Invest in stories, not symbols."** Cute, but "symbols" means nothing to a first-time investor.
- **"Featured story"** / **"Pick a story"**. "Story" is used where "theme" or "basket" is meant, which gives three words for one thing.
- **"Creator has $1.0k in it"** next to **"Followers 0"**. So who is this creator? Every basket is by @alloy_fi, so the "creator economy" is the house itself.
- **"Let winners run" / "Ride the trend" / "Keep the mix"**. These are rebalancing styles, but I only understood that from the How-it-works animation.
- **"takes over"** (a floating micro-label over a bar). Unclear.
- **"Cost ≈ $0.03"** next to **"Fee 1% a year"**. Two cost concepts with no explanation of how they differ.
- **"quote 00:06"** in the phone buy sheet. Trading jargon, and the countdown adds pressure.
- **"Tokenized stock exposure, not shares"**. An honest disclaimer, but it contradicts "Sell for dollars, or take the stocks" in "Nothing hidden". Do I get stocks or not?
- **"Biggest drop −0.0%"**. Reads as broken data.
- **"Your basket, your keys"**. Crypto slang that means nothing to the target audience.
- **"Sign in with email"** opens a Privy modal with Google, Twitter and wallet options. The label undersells the options and the modal looks like a different product.

## 3. Would I trust it with money?

**Not yet.** What helps: plain-language fee ("1% a year, nothing else"), disclosure up front ("Not available in the US. You can lose money."), the "How your money is held" card, and "Creator's own money" / "Skin in the game".

What kills trust:
- **Tiny social proof shown proudly.** "3 baskets live · $3.0K in baskets · 6 US stocks", "Followers 0" on every card, and "Be the first follower". Showing these numbers in a giant Anton font amplifies how small they are.
- **Every basket is by @alloy_fi**, with a letter "A" placeholder avatar. There are no real curators.
- **Testnet everywhere**: "Base Sepolia testnet", "Test dollars, not real money", "$25.00 test", "Add test money". This is fine for a demo, but a visitor can't tell whether the product is real.
- **Broken-looking data**: a $1.00 price, a flat-then-diagonal chart whose burgundy fill doesn't follow the line, and "−0.0%".
- There is no company name, legal entity, custodian, or regulator anywhere, and no "who is behind this".
- A third-party login modal (Privy, navy with a purple "I have a passkey" link) breaks the brand at the most sensitive moment.

## 4. Visual gut reaction

**Premium-ish dark fintech, about 70% there.** It is calmer and more confident than most web3 sites. There is real restraint: one accent, consistent cards, good spacing, and aligned 1136px columns.

- **Hero (desktop)**: strong. The condensed all-caps headline has punch, and the stacked fanned cards behind the featured card add depth. Two problems. First, the featured card changes height as it rotates (AI has 4 tickers, Tesla has 2), so the card jumps by about 20px every few seconds. Second, the empty band of about 140px between the hero and the trust strip makes the page feel unfinished on the first scroll (`d-04`).
- **Trust strip + stats row**: a good idea, but the stats undercut it (see trust).
- **How it works (pinned)**: the best section. The visual changes per step, and "Let winners run" is finally explained. On step 1, the right card has a large empty area at the top with three tiny thumbnails floating (`d-05`), which looks unloaded. Scroll pacing is fast: one wheel tick jumped from step 1 to step 4 in my capture, so steps 2–3 flash by.
- **Live baskets**: clean cards. Descriptions get cut off ("NVIDIA, Microsoft, Alphabet and…"), so the most useful info, the stocks inside, is hidden. Every card shows "0" followers in the corner.
- **Nothing hidden**: the diagonal-hatch burgundy band is the only place the brand colour floods. It's nice, but the hatching looks dated.
- **Build-a-basket CTA**: fine, but it duplicates the How-it-works recipe visual almost exactly.
- **Basket page (desktop)**: a solid two-column layout and a good sticky buy panel. The chart is the weak spot: the line starts flat, then rises diagonally and stops mid-width, while the fill continues to the right edge.
- **Cluttered?** No. **Empty?** A bit, in the hero gap and the How-it-works step 1. **Generic?** The body is generic Inter dark-mode. Anton is what gives it any identity.

## 5. Desktop vs phone, and broken interactions

- **The phone hero buries the product.** Headline, two full-width CTAs, disclaimer and stats take the whole first screen. The featured basket card starts at the very bottom edge (`m-01`).
- **The phone network pill is an icon only**: a blue circle with a chevron and no label. It means nothing until tapped.
- **The navbar changes between pages on phone**: home shows "Launch app", the basket page shows "Sign in". On desktop, "Launch app" disappears off the homepage.
- **On the phone basket page, three bars are stacked at the bottom**: the sticky "Price per share / Buy" bar, the bottom tab bar, and the chart showing between them. That takes about 270px of chrome on an 844px screen (`m-j-basket`).
- **The phone buy sheet has a wrong order**: "Sign in to buy" comes before the amount chips ($10/$25/$100) and "Change amount". You confirm before you choose. There is about 120px of dead space at the top of the sheet, and the "quote 00:06" timer adds pressure.
- **Mobile frames 05 and 12 have big empty black gaps** after the featured card and after the build CTA.
- **The Buy button on phone wasn't clickable for a moment**: Playwright waited 30s for it to become "stable", which suggests it keeps animating. Real taps may land late or be missed while it moves.
- **Explore cards are not links** (no `<a href>`). You can't open one in a new tab or long-press to preview.
- The network dropdown works. Its content ("Prices are real. Money is test USDC.") is the clearest testnet explanation on the site and should be visible without opening a menu.
- No console errors, apart from one 404 resource on desktop load.

## 6. Scores

| | /10 |
|---|---|
| Clarity | **7**: the subline is clear, but story/basket/recipe vocabulary and the rebalancing styles muddy it |
| Trust | **4**: honest disclosures, undermined by zeros, a house-only creator, testnet everywhere and odd data |
| Visual polish | **7**: restrained and consistent, held back by layout jumps, empty gaps and the chart |
| Mobile | **6**: readable, but the hero buries the product, the bottom chrome is stacked and the buy sheet order is wrong |

## 7. Colour palette & typography: fit for this product

### A) Colour palette

What's actually on screen (values read from rendered computed styles and CSS variables):

| Role | Hex | Where |
|---|---|---|
| Page background | `#0A0A0A` | everywhere |
| Surfaces | `#141416`, `#1C1C1F` | cards, stat tiles |
| Border | `#26262A` | cards |
| Text | `#F2F0ED` (warm off-white) | headings, body |
| Muted text | `#9A9894`, `#C9C7C3` | labels, sublines |
| Primary button fill | `#8C1230` (deep burgundy) | Explore baskets, Buy, Launch app |
| Brand (darker) | `#6D001A` | glows, tints |
| Accent | `#C41A42` (crimson) | "AI / TESLA" headline word, dots, active step |
| Pinks in the stripe bar | `#B0485F`, `#CBB8A6`, `#E8DCC8` (bone) | allocation stripes |
| Gold | `#DCC7A1` | "Creator has **$1.0k**", "Skin in the game" |
| Gain | `#3DBE8B` | ▲ +0.2% |
| Loss | `#FF6A3D` (orange-red) | ▼ 0.1 pts |
| Testnet blue | `#3E6FB8` | network dot |
| Third-party modal | navy plus purple link | the Privy login, off-brand |

**Associations.** Burgundy, black and gold read as **luxury, wine, private banking, nightclub**. It is premium, but in an exclusive and adult way, not a welcoming one. To a first-time investor in Lagos, Jakarta, São Paulo or Pune, a **red-dominant finance app reads as "losses" or "danger"**. Red means down in Western, Indian and African markets, the main audience. (Red means up in China, which isn't the target.) A full-burgundy hero with burgundy chart fills says "something is wrong" before a single number is read.

**Gains, losses and the brand colour fight each other.**
- The **primary Buy button is the colour of loss** (crimson/burgundy). Loss is `#FF6A3D`, which differs, but on a small phone in sunlight crimson and orange-red look like the same "red".
- The **chart area fill is burgundy even when the price is up** (+0.2% green label, red-ish area). Mixed signals.
- Gold for "creator's money" is a nice touch, but gold, bone and pinks in the stripe bar turn the allocation bar into decoration. Weights are hard to tell apart (40/25/20/15 all look like similar pink-beige bands).

**Contrast and readability.** Main text on the background is about 17:1 and muted `#9A9894` on `#0A0A0A` is about 6.9:1, both fine. White on `#8C1230` is about 9:1, also fine. The problems are **size, not contrast**: a lot of 12–13px muted text (labels, disclaimers, "Live price…", fee chips). The bone and pink stripes against dark have low internal contrast, so they can't be read as data.

**Dark vs light.** Dark-only suits crypto-native users and night-time phone use. But for first-time investors and people coming from bank apps, a **light mode reads as more "bank" and trustworthy**, and it works better outdoors and on cheap low-brightness LCDs common in the target markets. Dark-only also amplifies the nightclub feel.

**Verdict: adjust.** Keep a dark mode and the warm off-white and gold, but **move the action colour off red**. Use burgundy only as a brand mark and accent, never for Buy or chart fills. Make gain and loss the only red and green on any number-bearing screen. Add a light theme for the app screens.

**Alternative palette 1: "Deep teal trust"** (dark, still premium, finance-native)
- bg `#0B0F0E`, surface `#131A18` / `#1A2321`, border `#24302D`
- text `#F1F4F2`, muted `#9AA6A2`
- **primary / action `#14B8A6`** (teal, with dark text `#04201C` on it)
- brand accent `#C9A86A` (muted gold, for creator stake and "featured")
- gain `#22C55E`, loss `#EF4444`, warning `#F59E0B`, testnet `#60A5FA`

Why: teal reads as "money that grows, calm", like Wise or Robinhood-adjacent, without being bank-blue. Gold carries the premium feel. Red is freed up to mean only "loss".

**Alternative palette 2: "Warm light, ink and saffron"** (light-first, for first-time investors)
- bg `#FAF8F4` (paper), surface `#FFFFFF`, border `#E7E2D9`
- text `#16130F`, muted `#6B645A`
- **primary / action `#1F3A5F`** (ink navy, white text)
- brand accent `#E0892B` (saffron or marigold, culturally warm in India, Africa and LATAM, for highlights and featured items only)
- gain `#15803D`, loss `#B91C1C`, testnet `#2563EB`
- Dark-mode counterpart: bg `#0E1116`, action `#8DB4E8`, accent `#F0A04B`

Why: light paper with ink navy feels like a bank statement, the highest trust signal for a first-time investor. Saffron adds warmth and distinctness without suggesting losses.

### B) Typography

Fonts loaded and seen (via `document.fonts` and computed styles):
- **Anton 400**: hero headline (88px, all caps, line-height 0.95), big stats ("3", "24/7", "$3.0K"), large prices ("$1.00", "$25", "$1.0k").
- **Inter 400/500/600**: body (15px), headings (h1 on the basket page is 40px/600, -1px tracking), buttons (15px/600), labels (12–14px).
- **JetBrains Mono 400**: tickers (NVDA 12px), amount chips ($10/$25/$100), range toggles (1W/1M/All).

**How they feel together.** Anton is a poster or sports font: loud, condensed, streetwear or "meme-coin landing page". It gives the hero energy, but it **doesn't say "safe place for my savings"**. Using it for **money figures is the main problem**. Anton numerals are ultra-condensed with tight, uneven spacing ("$1 .00" shows a visible gap before the decimal on desktop and phone). "$3.0K" looks like a shout. Prices should be the calmest, most precise text on a finance screen.

JetBrains Mono for tickers and amount chips adds a **developer and terminal feel**: "1W 1M All" and "$10 $25 $100" look like code. It also adds a third voice, so three families compete on a single card (Anton price, Inter label, Mono ticker).

Inter is safe, readable and generic. It is fine, but it carries the entire product, so the brand has no personality outside the hero.

**Phone readability.** Body text is fine. The weak points are 12px labels ("Fee", "Minimum", the ticker text) and the condensed Anton numerals at small sizes ($25 in the How-it-works card). **Scanning numbers**: on the basket page, "40.1% / 24.9% / 20.1% / 15.0%" are in Inter with tabular alignment, which scans well. The Anton prices and stats don't.

**Hierarchy** is clear (big Anton, then Inter 600, then muted Inter), but the jump from 88px Anton to 13px muted text is extreme, with too few steps in between.

**Verdict: adjust.** Keep a display face for the hero headline only. Use one sans with tabular figures for all numbers. Drop the monospace, or limit it to ticker codes.

**Alternative pairing 1: Instrument Serif (headline) + Inter Tight / Inter with `tnum` (UI and numbers)**
Why: an elegant serif headline says "considered, long-term, premium", like a wealth manager rather than a degen. Inter with tabular figures makes every price line up and look precise. It drops to two families, with no mono.

**Alternative pairing 2: Manrope (headlines, 700–800) + IBM Plex Sans (UI, numbers with tabular figures; Plex Mono only for ticker codes if wanted)**
Why: Manrope is geometric, friendly and modern, and approachable for first-time investors. Plex Sans has a sober, institutional, slightly technical credibility (IBM heritage) and excellent numerals. Both have broad Latin-extended coverage for LATAM and African languages.

(A cheaper option: keep Anton for the single hero line, and set every price and stat in **Inter 600 with `font-variant-numeric: tabular-nums`**.)

### C) UX notes tied to colour and type

- **Action colour = loss colour.** "Buy" in burgundy, crimson active steps, and a burgundy "Let winners run" outline all read as warnings to a novice. Make the action colour neutral or positive. Keep red only for losses and destructive actions (Sell, Withdraw confirm).
- **The chart fill colour should follow direction** (green when up, red when down, neutral when flat), not the brand.
- **The allocation stripe bar is decoration, not data.** Pink, beige and bone bands can't be matched to tickers. Use one hue at stepped lightness, or the ticker brand colours already in the CSS (`--l-nvda #76B900`, `--l-msft #00A4EF`, …), with a legend.
- **Testnet blue (`#3E6FB8`) is the only cool colour**, so the testnet pill and the Privy modal stand out as foreign. Either embrace one cool neutral in the palette or make the testnet state amber (`--warn #F2B33D` exists already). Amber means "caution, test mode" far more clearly.
- **Gold for "creator's own money" is a good semantic choice.** Keep it and use it consistently (it's also used for "Skin in the game", which is good).
- **Anton for prices makes amounts look like slogans.** On the buy sheet, "$25.00" in Anton followed by a small grey "test" makes test money look like a gimmick. A calm sans for "You pay $25.00" is more reassuring.
- **Mono on the amount chips ($10/$25/$100)** makes them look like code tokens rather than tappable money buttons. Use sans, larger, with more padding.

## 8. Top 10 fixes (most important first)

1. **Change the action colour away from red or burgundy**: Buy, Launch app and Explore baskets. Use teal, ink or another non-loss colour. Keep red for losses only, and colour chart fills by direction.
2. **Hide or reframe vanity zeros**: remove "Followers 0", "Be the first follower" and the giant "3 baskets / $3.0K" stats until the numbers are meaningful. Replace them with things like "Starts at $5 · 1%/yr · Sell anytime".
3. **Set all money and stat numbers in a calm sans with tabular figures** (not Anton). Fix the "$1 .00" gap and drop JetBrains Mono from the amount chips and range toggles.
4. **Phone buy sheet: put the amount first**: chips and input, then You get / Cost, then the CTA. Remove the empty top area. Explain or remove "quote 00:06". Explain "Cost ≈ $0.03" ("one-time trading cost").
5. **Phone hero: show the featured basket in the first screen.** Shrink the headline, put the CTAs side by side or make one sticky, and move the $5/1%/Anytime stats below the card. Also remove the large empty gaps after the hero card and the build CTA.
6. **Make the testnet state clear and amber**: one inline banner ("Demo mode: real prices, test money") instead of a "Base Sepolia" pill. Give the network pill a text label on phone.
7. **Fix the featured card height jump** during rotation by using a fixed min-height and reserving space for up to 4 tickers. Use themes, not single companies (drop "TESLA" as a story word).
8. **Fix the basket chart** (the fill doesn't match the line, and the line stops mid-width) and hide "Biggest drop −0.0%" when there is no history.
9. **Show real curators and a "Who runs Alloy" line** (entity, custody, where the stock tokens come from) in the "How your money is held" card. Resolve "not shares" vs "take the stocks".
10. **Unify navbar and login**: same right-hand actions on every page. Rename "Sign in with email" to "Sign in". Theme the Privy modal to the Alloy palette. Make Explore cards real links. Slow the How-it-works pinned scroll so each step gets a full viewport.
