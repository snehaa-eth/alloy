# Alloy: certificate system (v4)

2026-11-19. **v4 replaces v3.** The founder flagged v3 (cards-v3.html) as too close to "Penny" by @Tobi_Builder, a public design in our builder community. The rounded black card, dot-matrix wave, mono tag chip, big number with two fact rows, white pill with a quiet link, captions under each card, and the "N cards, one shape" title were all too close. We kept only the **principle** (one consistent anatomy, few words, one action) and rebuilt the visual language as Alloy's own.

v3 files are kept for history only; don't build from them.

- Visual: `cards-v4.html` ("The Alloy register").
- Components: `components-v4.html` and COMPONENTS.md §v4.
- Screens: `wireframes-v4.html`.
- Builder: `cards-data/build_v4.py` + `cards-data/system_v4.py`.

## 1. The idea
Tokenized stocks are digital share certificates, so Alloy's documents look like **certificates**: engraved, framed, numbered, square-cornered. The recipe is shown as an **alloy bar**, a cross-section of layered metal bands, one per stock, with thickness equal to its weight.

## 2. Certificate anatomy (fixed order)

| # | Part | Spec |
|---|---|---|
| 1 | **Head** | 36px. Mono serial left (`No. 1591 · AIB`, derived from a hash of the basket's real series), **stamp** right: a hairline-outlined rectangle, mono 12 uppercase + Lucide icon, no fill. Hairline below. |
| 2 | **Engraving** | 104px **guilloche** generated in SVG from the basket's **real data**: <ul><li>two crossing wave-lattice families whose centre line follows the real price path, with amplitude set by daily volatility;</li><li>an epitrochoid **rosette** whose loop count = 5 + 2 × stocks and whose inner ring harmonic follows the top weight;</li><li>a double hairline frame with corner rings.</li></ul>Fine 0.5px lines in the basket's jewel tone. Unique and reproducible per basket. |
| 3 | **Signature rule** | 2px burgundy accent (`--acc`) under the engraving, on every certificate. |
| 4 | **Title** | Inter 15/600: the basket (or instrument subject). |
| 5 | **Figure** | Mono label (uppercase) over **Anton 32** figure + mono unit. The one Anton element on the screen. |
| 6 | **Alloy bar** | Optional. 32px layered bands (thickness = weight, jewel tone fading by rank, metallic sheen). A **pair** (now → after, same band order, diff legend) on amendments and receipts. |
| 7 | **Ledger** | Exactly two engraved fields side by side: mono key over Inter 15/600 value, hairline top/bottom, vertical hairline between. |
| 8 | **Action** | One **square-edged** (2px) full-width primary, or one secondary outline for read-only instruments. |
| 9 | **Foot** | 36px, hairline above: underlined link with → on the left, mono meta (countdown, date, creator) on the right. |

- **Box:** `--s1`, 1px `--bd`, **4px** radius.
- **In sheets:** `c-cert--flat` drops the box.
- **In lists:** a 64px row with a 44px rosette tile + a slim 10px alloy bar.
- **Budget:** ≤ 16 words per certificate (excluding numbers, tickers, quotes and links).
- **Rule:** one full certificate per screen; anything else is a row.

## 3. The ten instruments

| No. | Instrument | Stamp | Figure | Ledger | Action · link |
|---|---|---|---|---|---|
| I-01 | Holding | BASKET | $8.86 value per token | Since Aug 21 ▼ −11.4% · Creator in $1.2k · 28% (gold) | Buy · See inside → |
| I-02 | Buy order | BUY | $25.00 you pay | You get ≈ 2.82 AIB · Cost ≈ $0.03 | Buy $25 · Change amount → |
| I-03 | Redemption | EXIT | $37.92 USDC | You keep $88.48 · Cost ≈ $0.05 | Sell 30% · Get the stocks instead → |
| I-04 | Amendment notice | CHANGE (accent) | ≈ $14 of yours that moves | Runs Fri 9:45 PM · Reason (quoted) | Keep my basket · Exit before it runs → |
| I-05 | Rebalance receipt | TRIM | $0.06 your cost | Moved NVDA 27.6 → 30% · Reason 7.4 pts under (real drift) | See the trade (secondary) |
| I-06 | Held voucher | HELD (gold) | $17.38 value held | Amount 0.0651 · Network fee On us | Claim · Why held → |
| I-07 | Guard notice | WAITING (warn) | 3h 12m to open | Why Market closed · Sell fills now ~0.8% lower | Get the stocks · Sell anyway → |
| I-08 | Founding certificate | FOUNDING (gold) + TEST mark | #212 | Issued Nov 19, 2026 · Holder @asha | Share on X · Save image → |
| I-09 | Weekly statement | STATEMENT | −$4.16 on $126 (real 5-day move) | Trims · Change | See the week (secondary) |
| I-10 | Creator amendment | PROPOSE | 212 followers notified | Notice 24h · Reason | Send 24h notice · Preview follower view → |

## 4. Difference audit vs the reference ("Penny", tobi-small.jpg)

| Element | Reference | Alloy v4 | Different? |
|---|---|---|---|
| Card shape | Large rounded corners (~16–20px), soft black card | **4px** corners, hairline frame, a ruled head band and foot band | ✅ |
| Header art | Dot-matrix / dithered wave, one colour | **Guilloche engraving** (crossing line lattice + epitrochoid rosette + double frame) in fine strokes, seeded by real data | ✅ |
| Header-to-body join | Art fades into the card | **2px burgundy signature rule** under every engraving | ✅ |
| Top-left mark | Coloured circular app/crew icon over the art | **No icon over the art**; the identity is a mono **serial** in a head band | ✅ |
| Tag | Filled rounded chip with icon, inside the body | **Hairline stamp** (no fill, square) in the head band, opposite the serial | ✅ |
| Number | Large sans (Inter-like) | **Anton** condensed figure over a mono uppercase label | ✅ |
| Facts | 1–2 full-width key/value rows with hairlines | **Two-field ledger** side by side (key over value) | ✅ |
| Extra layer | — | **Alloy bar** (layered recipe bands, before → after pairs) | ✅ new |
| Primary button | White **pill** with icon ("Approve with Face ID") | **Square-edged** full-width block, label carries the amount | ✅ |
| Secondary | Centred "View details ›" text | **Foot band**: underlined link with → left, mono meta right | ✅ |
| Presentation | 2×4 grid, numbered labels above, caption sentence under every card, headline "Eight cards, one shape." | **Register layout**: one instrument per row with code (I-01), Anton name, purpose, the certificate, and an "Issued when / Action / Data" field list. Headline: **"The Alloy register."** No "N cards, one shape" phrasing anywhere. | ✅ |
| Names | Invest, Send, Pay a bill, Request, Errand, Guard, Pick, Weekly check-in | Holding, Buy order, Redemption, Amendment notice, Rebalance receipt, Held voucher, Guard notice, Founding certificate, Weekly statement, Creator amendment (finance-document vocabulary) | ✅ |
| Lists | — | 64px rows with a rosette tile + slim alloy bar (a full certificate is never repeated in a list) | ✅ |
| Tabs / nav | — | Underline tabs and a top-rule nav indicator (no pill tracks) | ✅ |

**Shared on purpose (generic principles, not visual expression):** dark surfaces, one primary action per surface, a small amount of text, one emphasised number. These are standard fintech practice and our own written principles (COPY.md word budgets, UX_MAP P-1).

## 5. Real data
The data is unchanged from v3:
- Base mainnet Chainlink feeds → `cards-data/feeds.json` (Aug 20 to Nov 18, 2026, ~63 daily closes per stock; all 8 feeds answered).
- Weighted indices → `cards-data/baskets.json`.

Engravings, serials, alloy bars, drift and the weekly move all come from these files. Stakes, holder amounts and counts are illustrative.

## 6. Regenerate
```
cd docs/design/cards-data
python3 -I fetch_feeds.py && python3 -I build_series.py   # data
python3 -I build_v4.py                                     # components-v4, cards-v4, wireframes-v4
python3 -I check_consistency.py ../wireframes-v4.html
node check_render.mjs file://$PWD/../wireframes-v4.html x /tmp/c.json && python3 -I inject_checks.py /tmp/c.json ../wireframes-v4.html
```

---

# (History) v3 card system: superseded, too close to the reference
# Alloy: card system (v3)

Visual: `cards-v3.html` (retired). It followed a reference too closely; see the v4 audit above.

Cards are compositions of components (COMPONENTS.md). Builder: `cards-data/build_v3.py`.

## 1. Anatomy (every card, in this order)

| # | Part | Spec |
|---|---|---|
| 1 | **Art header** | 88px tall, full bleed, `--bg`. A **dot-matrix area chart of the basket's real index**: 48×12 dots, r 1.6, 3-day smoothed. Crest dots are bright; depth fades and thins with a 4×4 ordered dither; empty cells form a 6% grid. Coloured by the basket's **jewel mid tone** via `currentColor`. Optional: top-left mark, top-right TEST watermark. |
| 2 | **Tag row** | Tag chip (mono 12 uppercase, 12px Lucide icon, intent: neutral / accent / warn / gold) on the left; **meta** in mono 12 `--tx2` on the right (time, countdown, count). |
| 3 | **Context line** | One line, Inter 12 `--tx2`: what and which basket. |
| 4 | **ONE number** | `--fs-hero` 32 Inter 600 tabular, with an optional unit in 12 `--tx2` ("per token", "USDC", "your cost"). **Anton only for a hero moment** (Founding #). |
| 5 | **Facts** | 1–2 fact rows: hairline top, key Inter 12 `--tx2`, value mono 12 (can hold logos or a logo stack). |
| 6 | **Actions** | One primary pill (48px, full width), or one secondary outline for read-only cards, plus **one** quiet link (12, chevron). |

- **Box:** `--s1` fill, 1px `--bd`, radius 20. Body inset 12 top, 16 sides, 16 bottom. 8px gaps.
- **In sheets:** the `c-card--flat` modifier drops the border and fill, so nothing is double-boxed.
- **Width:** 320 in the gallery, full width (358) in screens.
- **Type:** 32 / 15 (buttons) / 12. Three sizes.
- **Budget:** ≤ 16 visible words, excluding numbers, tickers, meta, quotes and quiet links.
- **Colour = which basket** (art); **tag = what kind**. Burgundy appears only as the accent tag or a burgundy-tone basket. Gold only for founding / held / creator stake.

## 2. The ten cards

| # | Card | Tag · meta | Number | Facts | Action · link | Why it exists |
|---|---|---|---|---|---|---|
| 01 | Basket | BASKET · 5 stocks | $8.86 per token | Since Aug 21 ▼ −11.4% · Creator stake $1.2k · 28% (gold) | Buy · See inside | Explore. Real history is the art; honest even when it's down. |
| 02 | Buy confirm | BUY · quote 0:12 | $25.00 | You get ≈ 2.82 AIB · Cost ≈ $0.03 · fee 1%/yr | Buy $25 · Change amount | The sheet is the review. |
| 03 | Exit | EXIT · any day | $37.92 USDC | You keep $88.48 · Or get the stocks (logo stack) | Sell 30% · Get the stocks instead | Two equal outcomes; in-kind never pauses. |
| 04 | Recipe change | CHANGE (accent) · 14:22:05 | ≈ $14 of yours moves | MSTR 40% → 30% · NVDA 20% → 30% | Keep my basket · Exit before it runs | The one interruption. Doing nothing means staying. |
| 05 | Trim receipt | TRIM · Nov 18 | $0.06 your cost | Moved NVDA 27.6% → 30% · Why 7.4 pts under target | See the trade (secondary) | After the fact; no action. The drift numbers are **real**. |
| 06 | Claim | HELD FOR YOU (gold) · no expiry | $17.38 AMZNc | Amount 0.0651 AMZNc · Network fee On us | Claim · Why held | Blocked transfers are held, not lost. |
| 07 | Guard | WAITING (warn) · rebalance | 3h 12m to open | Why: US market closed · Sell fills now ~0.8% lower | Get the stocks · Sell anyway | One-line reason plus the option that still works. Variants: blocked token, stale price. |
| 08 | Founding # | FOUNDING (gold) · Nov 19, TEST watermark | **#212** (Anton) | Your slice (logo stack) · Link | Share on X · Save image | The share moment (primary post-buy CTA). |
| 09 | Your week | YOUR WEEK · Nov 11 to Nov 18 | −$4.16 on $126 | Trims 1 · $0.06 · Change coming in 14h | See the week (secondary) | Sunday note, just for reading. The weekly % is real. |
| 10 | Creator propose | PROPOSE · 24h notice | 212 followers | MSTR 40% → 30% · Reason | Send 24h notice · Preview follower view | Creator tools use the same shape. |

## 3. Real data (dot art and the numbers marked real)
- **Source:** Chainlink feeds on **Base mainnet**, read with `getRoundData` over the public RPC (`https://mainnet.base.org`).
  - `cards-data/fetch_feeds.py` → `feeds.json`.
  - All 8 feeds answered: AAPL, AMZN, GOOGL, META, MSFT, MSTR, NVDA, TSLA.
  - Feeds report price × uiMultiplier per raw token, 8 decimals.
  - The current phase starts **Aug 20, 2026**, so ~62–65 daily closes exist, not 90. No synthetic data was needed.
  - The public RPC rate-limits at 25 req/s, so the script reads every 4th round in throttled batches. Daily close = the last sampled update of each UTC day.
- **Basket indices:** `cards-data/build_series.py` → `baskets.json`. Buy-and-hold weighted index, first common day = 100.

| Basket | Recipe | Aug 21 → Nov 18 | Max drawdown |
|---|---|---|---|
| The AI Build-Out (sapphire) | NVDA 35 / MSFT 25 / GOOGL 20 / AMZN 12 / META 8 | **−11.38%** | −18.83% |
| Big Tech, Trimmed (emerald) | AAPL / MSFT / GOOGL / AMZN / META 20 each | **+3.33%** | −11.43% |
| Capitol Tech (burgundy) | MSFT 30 / NVDA 30 / AAPL 20 / GOOGL 20 | **−8.06%** | −15.23% |
| Picks & Shovels (amber) | NVDA 40 / AMZN 30 / MSFT 30 | **−9.58%** | −15.30% |
| Conviction Bets (plum) | MSTR 40 / TSLA 40 / NVDA 20 | **−9.18%** | −27.21% |

- **Assumption:** value per token is $10.00 at launch, so The AI Build-Out is at $8.86 today.
- **Illustrative, not real:** follower/creator PnL splits, stakes, holder amounts and counts.
- **Note for the founder:** four of five seed recipes are down since launch on real prices. The cards show this honestly, which is the product's whole point ("did followers win?"). Consider whether the seed baskets or launch copy should acknowledge it.

## 4. Do / don't
- **Do:**
  - one number,
  - mono for anything you'd compare,
  - real data or a labelled synthetic series,
  - a unit after the number instead of a sentence.
- **Don't:**
  - photo covers on cards (photos appear only on the basket page hero),
  - a second primary,
  - more than 2 facts,
  - burgundy art for warnings (warn uses the amber tag; the art stays the basket's colour).

## 5. Regenerate
```
cd docs/design/cards-data
python3 -I fetch_feeds.py      # ~3 min (rate-limited public RPC)
python3 -I build_series.py
python3 -I build_v3.py         # writes ../components-v3.html, ../cards-v3.html, ../wireframes-v3.html
python3 -I check_consistency.py ../wireframes-v3.html
```
