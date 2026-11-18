# Alloy: card system (v3)

"Ten cards, one shape." Visual: `cards-v3.html`. Reference studied: "Penny" by @Tobi_Builder ("Eight cards, one shape"). We borrowed the discipline, not the look.

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
