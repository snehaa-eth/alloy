# Alloy: AI-slop audit and three art directions

Date: 2026-11-19. Reviewed: localhost:3000 (home, /explore, /b/<AI Build-Out>, buy sheet) at 1440x900 and 390x844.
References studied: mercury.com, public.com, robinhood.com, stripe.com, linear.app, ramp.com, monzo.com (wealthsimple.com blocked the crawler).

Screenshots (scratchpad, `SP=/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad`):
- Alloy: `$SP/audit/hd-00..06.png` (home desktop, one per scroll step), `hm-00..07.png` (home phone), `explore-d.png`, `explore-m.png`, `basket-d.png`, `basket-d-s0.png`, `buy-d.png`, `buy-m.png`
- References: `$SP/refs/*.png`
- Mockups: `$SP/artdir/` (see the end of this file)

---

## Part 1. Why it reads as "AI slop"

The verdict first. The product thinking is good: weights, what $25 buys, the creator's own money, "nothing hidden". The parts are not the problem. The problem is that each surface uses the default answer, and the default answers add up to the 2025 "v0 / Lovable dark SaaS" template. Nothing on the page could only belong to Alloy. Delete the word "Alloy" and it could be any crypto app.

Ranked by how much each one adds to the "slop" feeling (biggest first).

### 1. AI-rendered "moody red sci-fi" thumbnails (biggest single tell)
Seen in: `hd-00` (hero card and the two cards behind it), `hd-01`, `hd-04`, `explore-d`, `basket-d` (hero banner).
Red circuit-board corridors, a server-room tunnel and a ringed planet, all with the same monochrome crimson grade and the same soft glow. To a 2026 viewer these look exactly like Midjourney or Firefly output. They also say nothing. A planet for "Conviction Bets"? A circuit board for Microsoft? Every viewer has seen thousands of these. They are the strongest "made by AI" signal on the site, and they appear on every card, so you can't miss them.
**What great sites do:** Mercury and Public use real, art-directed photography or film. Linear and Ramp show the actual product UI. Stripe uses one owned generative graphic (the gradient "wave") that is theirs alone. **For Alloy:** the basket's own data *is* the picture: weights, logos, a shape made from the weights. No stock or AI art at all.

### 2. The hero recipe: condensed all-caps headline, one coloured word, pill eyebrow, two buttons, tilted card stack on the right
Seen in: `hd-00`, `hm-00`.
"BUY THE WHOLE / **BIG TECH** / STORY." is set in a Bebas/Anton-style compressed grotesk, with one line in the accent colour. Above it sits a pill badge with a dot ("• Invest in stories, not symbols"). Below it are a primary and a ghost button and a small disclaimer. On the right is a "featured" card fanned over two blurred cards. Every one of these is the default output of AI site builders. The compressed caps also clash with the calm Inter everywhere else. It reads like an energy-drink ad pasted onto a fintech app.
**What great sites do:** they use one confident, well-set sentence in a typeface with character (Public's and Robinhood's serif, Linear's tight grotesk). There is no pill eyebrow and no coloured word. One CTA leads.

### 3. Everything is a rounded dark card inside a rounded dark card
Seen in: `hd-01..03` (step list in cards, demo inside a card), `hd-04` (cards with stat sub-cards inside), `hd-05` ("How your money is held" card), `hd-06` (CTA card holding another card), `basket-d-s0` (5 stacked cards).
The same 16–24px radius, 1px #2a border and #1a1414 fill are used at every level. "Return / New" and "Invest / From $5" are each boxed in their own mini-card inside the card. With no change in hierarchy, the page has no rhythm. It looks like a component library demo.
**What great sites do:** they use one container style at most and let type, rules and whitespace do the grouping. Ramp and Stripe use hairline rules and grids. Mercury uses open space.

### 4. Generic icon row and three-up "feature" icons
Seen in: `hd-00` (trust bar: "Exit anytime · Every trade explained · Your basket, your keys"), `hd-05` (three outlined-circle icons with headings and 2-line copy), the "How your money is held" list with a Lucide icon on every line.
Lucide/Tabler icons in circles, three across, are the most recognisable template block on the web. They add no information.
**What great sites do:** they show the real thing (a real fee number, a real screen) or they write one sharp sentence. When Robinhood and Stripe make a claim, they put a number on it.

### 5. Radial "glow" washes and diagonal-stripe texture
Seen in: `explore-d` and `basket-d` (crimson glow top-left), `hd-05` (oxblood corner gradient and diagonal hatching).
A soft colour bloom behind the content is the most common way generated sites fake "atmosphere". Here it also muddies the oxblood, which turns brown-pink instead of reading as a deliberate colour.
**What great sites do:** flat, confident fields of colour (Monzo's coral, Ramp's lime, Robinhood's neon used as a solid). If there is texture, it means something.

### 6. Copy cadence: short fragment, "label · label" lists, borrowed slogans
Seen in: "Live baskets / Popular right now." `hd-04`. "Nothing hidden" `hd-05`. "Have an idea? Build a basket." `hd-06`. "It runs on autopilot / You don't lift a finger." `hd-02`. "Winners grow, and so does your basket."
Each line is fine alone. Together they show the AI cadence: a two-word heading, a one-line sub, then a cliché ("lift a finger", "autopilot", "nothing hidden"). Copy that only fills space reads as generated.
**What great sites do:** they use fewer, more specific sentences with numbers. Ramp: "Time is money. Save both." Robinhood: "Get started with as little as $1."

### 7. Avatar "A" in a glowing ring, and "@alloy_fi · has $1.0k in it" on every card
Seen in: `hd-00`, `hd-04`, `explore-d`.
All three baskets have the same creator, shown with a placeholder initial avatar that has a gradient ring. It makes the marketplace look empty and the data look like seed data. "$1.0k" and "$999" side by side make it worse.
**What great sites do:** they show real curators with real faces or real names, or they don't make the creator the hero until there are several.

### 8. Weight bars in four shades of beige-grey, plus a separate legend
Seen in: every card (`hd-04`, `explore-d`), `basket-d-s0`.
The allocation bar is the most "ownable" thing Alloy has, but it is drawn as the default stacked progress bar with 2px gaps and muted fills, plus a legend of tiny squares. It doesn't feel designed, so it reads as a component.
**What great sites do:** they take the one chart that is theirs and make it iconic (Stripe's gradient, Robinhood's single line chart). The three directions below each turn the weights into the brand.

### 9. Smaller tells
- Next.js dev "N" badge bottom-left (dev only, but it is in every screenshot and in any demo recording). `hd-00`
- The "Test mode" pill with a blue dot next to the Sign in pill: two pills of the same weight in the nav.
- Phone home (`hm-00`) shows a pill nav, two pill CTAs, a pill "Featured basket", pill chips and a fixed tab bar: about seven pill shapes in one viewport.
- "Return: New" in a stat box: an empty stat dressed up as a stat.
- Motion: every section fades and slides up on scroll (`hd-04`/`hd-05` captured mid-fade with blurred ghosting under the nav). Generic scroll reveals are a strong template signal.
- Inter for everything. It is a fine typeface, but it has no voice.

### Why "decent only"
The other user is right that it's decent. Spacing is consistent, the buy sheet (`buy-d`, `buy-m`) is clear and honest, and the numbers add up. "Decent" is what you get when every choice is correct and none of them is distinctive. Fixing 1, 2, 3 and 8 moves it from "decent" to "designed".

### About the founder palette
Oxblood #6D0F24 is a good, rare identity colour in fintech: no one in the category owns it. It fails today for three reasons. It is used as a glow instead of a solid. It is mixed with AI-red imagery, which makes it look like "dark red theme". And it never appears as a large flat field. Keep it, and use it flat and large (Direction B) or as fine ink (Direction A). Copper only for Buy is a good rule. Keep it in A and B. In C, copper becomes one of the materials, so Buy changes to cream there (explained below). Cream #F2EDE8 works best as *paper*, not as text on near-black.

---

## Part 2. Three art directions

None of these uses AI imagery. All three are built from typography, the basket's real weights, and the real company logos (monochrome, via simple-icons). Each mockup shows the landing hero (1440 and 390), basket cards and the buy sheet with real content: The AI Build-Out, NVDA 40 / MSFT 25 / GOOGL 20 / AMZN 15, from $5, 1% a year. (The stock prices in B's table are placeholders.)

### A. Bearer — "Every basket is a certificate you can hold" (light-mode-first)
**Idea:** A modern take on the engraved share certificate. Each basket gets a guilloche rosette generated from its real weights. The rosette is unique per basket, works like a fingerprint and can't be faked by a stock image.
**Why it fits:** Owning a piece of a US company is the whole promise, and first-time investors in Lagos, Pune or Jakarta know the paper certificate as the symbol of real ownership. A certificate says "this is real, and it's yours", which is exactly the trust gap for an unknown crypto-rail brand. It also gives "stories" a literary register (serif, italic).
**Why it won't read as AI/template:** The rosette is maths from the basket data (one ring per stock: ring width = weight, number of lobes and phase from the ticker). It is drawn as hairlines on paper, with sharp corners, dotted leader lines and serial numbers. Template sites never use sharp corners, hairlines or serif numerals.
- **Type:** Newsreader (display and italics, optical sizes), IBM Plex Sans (UI), IBM Plex Mono (numbers, serials, labels). All are Google Fonts.
- **Colour:** paper #F2EDE8 (the founder's cream, used as the page), card paper #F8F4EE, ink #1B1516, secondary ink #5E5452, rule #CFC4B8, oxblood #6D0F24 as engraving ink only (rosettes, borders, accent italic), copper #B8693F only for Buy.
- **Grid/layout:** 12 columns, 1200px max width. The hero is a 2-column split with the certificate as the object. Generous margins. Hairline rules instead of boxes.
- **Imagery system:** rosettes and wave bands generated per basket. Real logos at 15px, one ink colour. No photos. For press or social, the rosette works as the share image.
- **Components:** 0px radius everywhere. 1px ink borders, plus a 0.5px oxblood inner rule on the certificate. Buttons are solid ink rectangles. Buy is a copper rectangle with a 2px darker bottom edge (like a pressed stamp). The buy sheet is a "stub" with a dashed tear line under its header.
- **Motion:** "Drawn, not faded." Rosettes draw their strokes in (stroke-dashoffset) when a basket appears. On rebalance, the rings morph to the new weights. Numbers count. Nothing slides up on scroll.
- **Voice:** formal, plain and calm. Examples: "Own the whole story, from $5." / "This records your stake in four companies." / "Every change, signed and dated."
- **Risk:** it can tip into a heritage-bank costume. Keep the serif for headlines and numbers only, and keep the UI in Plex Sans.

### B. Index — "Your money, in 100 squares" (light-mode-first)
**Idea:** Swiss, data-first typography. The brand device is a 10x10 waffle: one square = 1% of your money. At $25, a square is 25¢, so "40 squares of NVIDIA" teaches fractional investing in a single look. Oxblood is a large, flat poster field.
**Why it fits:** The audience is first-time investors. The biggest barrier is "how can $5 buy NVIDIA?", and the waffle answers it with no words. It's precise and numerate, so it reads as trustworthy, like a newspaper markets page, not a casino.
**Why it won't read as AI/template:** It's flat, square and typographic. The colour is one solid field (no glow), the chart is the hero, tables have real columns, and there are no icons or illustrations at all. It's closer to a Bloomberg or Swiss poster than to SaaS.
- **Type:** Archivo, using its width axis (112 for display, 100 for text), plus DM Mono for every number.
- **Colour:** page #F7F6F3, cards #FFFFFF, ink #0F0E0E, secondary #56514F, rule #DAD6D0, oxblood #6D0F24 as a flat field and for data, oxblood tints at 100/72/48/28% for the stocks, up-green #1F7A4D used only on change values, copper #B8693F only for Buy.
- **Grid/layout:** a visible 12-column structure. The hero is split 50/50 with the oxblood field bleeding to the right edge. A 1px black rule under the nav and above the tables. Big numerals act as section heads.
- **Imagery system:** waffle charts (large in the hero, 150px on cards), split bars that show dollars, and real monochrome logos in tables. Every graphic is a true chart of the basket.
- **Components:** 2px radius (nearly square), a 3px black top rule on cards instead of a border, a segmented amount selector, and a Buy button that shows the price right-aligned ("Buy ........ $25.00").
- **Motion:** "Count, don't fade." The waffle fills one square at a time in stock order when the amount changes, and numbers tick in place. Nothing moves that isn't data.
- **Voice:** blunt arithmetic. Examples: "Put $5 on an idea, not a ticker." / "40 squares of NVIDIA. 25 of Microsoft." / "1% a year. That's it."
- **Risk:** it can feel cold. The oxblood field and the human headline carry the warmth, so keep them big.

### C. Strata — "Four companies, cast as one" (dark)
**Idea:** It takes the name literally. An alloy is metals fused together, so each basket is drawn as a cast ingot in cross-section. Each stock is a band of real material (oxblood lacquer, copper, brass, pewter) whose width is its weight, with a measuring ruler underneath. The wordmark is a tiny ingot of the same four bands.
**Why it fits:** It's the only direction that makes the name *mean* something on screen. It keeps the founder's dark mode and copper/oxblood warmth, and it feels premium in the way the founder likes ("Robinhood/Coinbase" plus "Aave/Morpho").
**Why it won't read as AI/template:** Each band is a flat colour with a fine brushed texture, sized exactly by the data. There is no glow, no 3D render and no gradient blob. The ruler and the mono labels make it read as measured and engineered.
- **Type:** Funnel Display (headlines, big numbers), Funnel Sans (UI), Martian Mono (labels and figures). All are on Google Fonts and new enough not to be template defaults.
- **Colour:** background #0C0A0A, surface #141111, line #2A2423, text #F2EDE8 / #A39A94 / #6B635F. Material bands are oxblood #6D0F24, copper #B8693F, brass #A8925E and pewter #8D8984. The Buy button is cream #F2EDE8 with dark text. Here copper is a material and appears in every basket, so it can't also signal Buy. Cream is the brightest object on a dark page, so Buy still stands out most.
- **Grid/layout:** wide, full-bleed horizontal compositions. The headline and the "fact strip" sit above and below one big object. On phone the ingot turns vertical (bands stack).
- **Imagery system:** ingots generated from the weights at every size: the hero (260px tall), cards (64px), the buy sheet (48px, labelled in dollars) and the favicon. Metals are assigned by rank (the largest holding is always oxblood), so every basket matches the brand.
- **Components:** 6–16px radius (softer, more app-like), pill buttons and chips, 1px dark lines. Cards have one level only, with no nested cards.
- **Motion:** "Pour." When the amount changes, the bands fill left to right like liquid metal settling, and a rebalance re-casts the bar. The motion is physical and short (250–400ms) with no bounce.
- **Voice:** maker or engineer, short and declarative. Examples: "Four companies. Cast as one." / "Mixed stronger." / "Your basket, by weight."
- **Risk:** it's the closest of the three to the current dark look. The brushed texture must stay subtle, or it slides back into "gradient slop".

---

## My pick: B (Index), with A's rosette as the share and receipt layer

B fixes the most important thing for this audience: it *explains* fractional ownership at a glance ("1 square = 25¢"). It's the one least likely ever to be called AI-made, because it has no decorative imagery to doubt. It also uses oxblood the way a strong brand colour should be used: flat, large and on its own. Light-mode-first also separates Alloy from the crowd of dark crypto apps and reads as "regulated finance" to first-time investors.

A is the most distinctive and the best emotional fit for "owning a piece". I would use its generated rosette as the post-purchase receipt, the share card for X and WhatsApp, and the basket "seal". C is the safest move from the current site and the best for the name, if the founder wants to stay dark.

Whichever is chosen, do these first:
1. Delete every AI thumbnail.
2. Remove the condensed caps headline, the pill eyebrow and the icon rows.
3. Use one container level.
4. Make the weights the hero graphic.

---

## Files
- Direction A: `$SP/artdir/a-bearer.html`, `a-bearer-desktop.png`, `a-bearer-phone.png`
- Direction B: `$SP/artdir/b-index.html`, `b-index-desktop.png`, `b-index-phone.png`
- Direction C: `$SP/artdir/c-strata.html`, `c-strata-desktop.png`, `c-strata-phone.png`
- Overview of the three heroes: `$SP/artdir/overview-heroes.png` (source `overview.html`)
