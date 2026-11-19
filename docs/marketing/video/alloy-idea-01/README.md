# ALLOY IDEA 01: "Which stocks?" (production notes)

- **Brief:** `DIRECTION.md` (Director).
- **Notes applied:** `REVIEW-01.md`. This is the v2 render.
- **Format:** 26.0 s, 780 frames, 30 fps.
- **Grid:** 120 BPM (1 beat = 15 f). Major events land on f0, 60 … 720.
- **Hook:** H1.

## Files (`out/`)

| File | What |
|---|---|
| `alloy-idea-01.mp4` | **9:16 delivery**, 1080×1920, ≤ 50 MB. No music: the audio track is silent until licensed audio arrives (below). |
| `alloy-idea-01-1x1.mp4` | **1:1 cut**, 1080×1080. Same timeline; DIRECTION §11 explains how it's reframed. |
| `alloy-idea-01-floating-cities.mp4`, `alloy-idea-01-galactic-rap.mp4` (+ `-1x1-` versions) | Versions with music, by Kevin MacLeod (CC BY 4.0), mixed quietly at −18.5 LUFS. |
| `alloy-idea-01-voltaic.mp4` (+ `-1x1-`) | Alternate music version. |
| `review-02/` | The stills the Director asked for in REVIEW-02: f60–f72, f628–f634, f718–f722, f570 and f525, in both cuts. |
| `*-master.mp4` | CRF 18 video-only masters. They're large because the 4% grain changes every frame. |
| `poster-f0.png`, `poster-f90.png`, `poster-f720.png` | Lossless, straight from the page. |
| `contact-sheet.png` | Every 15th frame. Unsafe areas are tinted red; the 1:1 band is outlined in cyan. |
| `contact-sheet-50pct.png`, `contact-sheet-1x1-50pct.png` | Every 30th frame **at 50% size**: 540×960 and 540×540, the size a phone shows. Use these to judge legibility. |
| `budget.csv` | For every 5th 9:16 frame: burgundy %, gold %, text pixels in unsafe areas, headline + caption words. |

## Re-render

Run `NODE_MODULES=/path/with/playwright-core/node_modules ./scenes/build.sh`.
- It needs Chrome in `/Applications` and `/opt/homebrew/bin/ffmpeg`.
- It takes about 16 min for both cuts.
- `SKIP_VIDEO=1` re-uses the masters.

In `scenes/`:
- `index.html` holds every shot. `renderAt(t)` is a pure function of the frame; `?sq=1` gives the 1:1 cut.
- `render.mjs` drives the render; pass `--sq 1` for the square cut.
- `gen_guil.py` regenerates `assets/guil.js`.
- `budget.mjs` runs the QA audit.

## UI: the v4 "Certificate + Alloy bar" (REVIEW-01 A1)

- **Certificate anatomy** follows `docs/design/cards-v4.html` and `cards-data/system_v4.py`, scaled to video size: the certificate is 870 px wide at x 90–960. It has, in order:
  - a mono serial head with a hairline stamp (`BASKET`, `BUY`, `ISSUED`, `TRIM`, `CHART`, `DRAFT`, `EXIT`),
  - the guilloche engraving,
  - a 4 px burgundy signature rule,
  - an Inter 600 title,
  - a mono label and an Anton figure,
  - the Alloy bar with its mono legend,
  - a two-field ledger,
  - a square off-white primary button,
  - a foot.
- **Every UI text is ≥ 30 px.**
- **Engravings come from the real generator.** `scenes/gen_guil.py` imports `system_v4.guilloche()` and `seed_of()` and runs them on the real `baskets.json` series and recipes. Serials come from the same seed: `No. 1591 · AIB`, `No. 2710 · PNS`, `No. 3596 · BTT`, `No. 8183 · CVB`.
- **Alloy bar:** stacked jewel bands (thickness = weight), 2 px gaps, and a moving sheen. The legend reads `NVDA 35  MSFT 25  GOOGL 20  AMZN 12  META 8`.
- **Retired from this video:** the cover photos and the burgundy radial glow.
- **No return figures anywhere:** no `−11.4%`, no `test` unit, and no gold `CREATOR IN`.

## REVIEW-01: what changed, note by note

**A. Global notes**

| Note | Done |
|---|---|
| A1 | All UI is v4 certificates; photos and the glow are gone. |
| A2 | The certificate sits at x 90–960, top y 470–560. Headlines sit in y 200–420. The 9:16 sheet shows how each shot fills the frame. |
| A3 | Mono is used only for serials, stamps, labels, legends and ledger keys. The headline and the certificate figure are the only Anton. All UI text is ≥ 30 px. |
| A4 | The burgundy glow is removed. |
| A5 | The step markers are now mono stamps (`01/03`, `02/03`, `03/03`, 44 px, hairline box), and the headlines are left-aligned after them. |

**B. Shot notes**

| Note | Done |
|---|---|
| B1 | Wall re-laid in rows with ≥ 24 px clearance, using a conservative width estimate. Flashes are capped at `#9A9894`, live box only, and never within 80 px of the headline plate. |
| B2 | From f60 the 5 basket tickers turn paper at 72 px and spring (no overshoot) along a 3-frame trail. They land exactly on the legend's ticker positions and switch to mono as they lock. The other tickers drop out with `ease-in` and are gone by f70. The certificate lands at f66 (1.04 → 1.00), and its bar bands grow from zero over f66–f75. |
| B3 | The Holding certificate: `FROM $5`, ledger `STOCKS 5` / `STRATEGY Balanced`, primary `Buy`, foot `See inside →` / `@kavya`. |
| B4 | The carousel runs CVB (plum) → PNS (amber) → BTT (emerald) → AIB (sapphire), each with its own engraving and bar. The tap ring is on `Buy` at f165. |
| B5 | Buy Order (`BUY` stamp): presets → `YOU PAY $0.00 → $5.00` at f195 → `YOU GET ≈ 0.56 AIB` / `NETWORK FEE On us` → `Buy $5`, which press-fills over f210–f229. The foot carries the compliance micro at 30 px. |
| B6 | No dead frame. On f240 the same certificate (same top) becomes its receipt: `ISSUED` stamp, gold ring drawn in the art slot over f240–f257, title `You're in.`, figure `0.56 AIB`. |
| B7 | The `AIB` chip (f255) expands into the 56 px Alloy bar one band every 3 frames (f262–f274), with the legend underneath. |
| B8 | A big Alloy bar (330 px tall) with the non-NVDA bands at 35% opacity. The figure `35% → 41%` ticks over f305–f335. A 4 px warn line at the 40% edge carries a `BAND 40` mono tag and pulses at f335. At f360 there's the `TRIM` stamp and the rebalance pair (now → after, `NVDA 41→40`), with the figure `41% → 40%`. At f375 the ledger shows `REASON "NVDA ran ahead."` / `COST ≈ $0.05`. The caption arrives at f390. |
| B9 | The chart is now an explicit illustration: rising, then sideways, with no late drop. The creator line is dashed `#9A9894` at 3 px and sits **above** the solid follower line (3 px), with the gap widening to 14 px. The certificate shell has the head `EXAMPLE BASKET` with a `CHART` stamp, the key `FOLLOWERS VS CREATOR`, and the Anton `−0.6%` at f480. The foot reads `Illustration. Past performance isn't a promise.` (30 px). |
| B10 | A `DRAFT` certificate: 2×2 stock chips (44 px). The plum Alloy bar fills band by band (25 → 100%) with the legend `NVDA 25 AVGO 25 TSM 25 VRT 25` and `100% ✓`. The square tone swatches select plum at f585. The background tickers are kept. |
| B11 | Redemption (`EXIT`): `YOU RECEIVE 0% → All` with a slider. The foot link is pressed at f627–f629, the certificate flips (f627–f633, face swaps on f630) to the in-kind face, and the bar dissolves into five `…c` chips (34 px) in the `YOUR ACCOUNT` row by f645. The f645–f659 hold is still. |
| B12 | The silk is gone. A five-tone Alloy bar (sapphire, emerald, amber, plum, burgundy; 44 px) reveals left to right under `NOT SYMBOLS.` over f690–f705, with a sheen pass over f705–f719. |
| B13 | The tagline bar shrinks into a 300×22 bar between `ALLOY` and `Stories, not symbols.`. `COMING SOON` is a 1 px hairline box with 4 px corners. |

**D.** The 1:1 cut is delivered.
- The hook and tagline are cropped.
- Product shots fit each certificate under the re-set headline (0.8× Anton). The caption goes under the headline.
- The end card has its own stack.
- Everything stays above y 980, leaving the bottom 100 px for player chrome.

## REVIEW-02 fixes

1. **The turn, f60–f72:**
   - At f60 the five basket tickers exist only as their flying copies. The motion trail draws a ghost only when it is far enough behind to read as motion, so there are no static duplicates.
   - The wall fades out over f60–f65 and is at 0 opacity before the certificate's first frame at f66.
   - The tickers land one frame apart, left to right: NVDA f67, MSFT f68, GOOGL f69, AMZN f70, META f71. Each uses `ease-in-out` (no overshoot) onto its own legend slot, and its legend number appears as it locks.
2. **Exit, f628–f632:** the 3D flip is replaced by a 4-frame crossfade with a 12 px rise, from the Redemption face to the in-kind face.
3. **End card:** the Alloy bar hard-cuts into its 300×22 slot under `ALLOY` on the f720 downbeat. It no longer travels, so it never crosses text, in either cut.
4. **S10 background tickers:**
   - They're re-seeded as MSTR, META and SPCX, more than 24 px apart and at least 60 px above the caption.
   - They're dropped from the 1:1 cut.
5. **S9 chart:**
   - The creator–follower gap grows from 0 to 20 px.
   - The figure uses a true minus. Anton has no U+2212 (or U+2192), so both are drawn as shapes in every Anton figure. No fallback font is ever used.
6. **Conviction Bets** in the plum slot is accepted as is.

**Lead's note on the ticker universe:**
- Every stock shown as something we offer comes from NVDA, AMZN, GOOGL, META, MSFT, MSTR, TSLA, AAPL, SNDK, SPCX:
  - the five that fly into the card (NVDA, MSFT, GOOGL, AMZN, META),
  - all four recipes (AIB, BTT, PNS, CVB),
  - the S10 picker, now `NVDA AAPL SNDK TSLA`,
  - the S10 background tickers.
- Only the S1 hook wall uses broader AI tickers, as the "everyone says buy AI" noise.

## Music (CC BY 4.0, attribution required)

All tracks are by Kevin MacLeod (incompetech.com), licensed CC BY 4.0. The config is in `audio/track-*.json`.

- **Founder feedback (round 3):** Cephalopod was dropped as too noisy, and its file was removed. Versions are now made for the calmer candidates.
- **Mix:** quiet and clean.
  - The master target is **−18.5 LUFS** integrated, ≤ −1.5 dBTP, so the music sits under the picture.
  - 0.8 s fade-in and 1.6 s fade-out.
  - The S11 break (f645–f659) is gated to −30 dB with 40 ms ramps.
  - No SFX are added.

| Track | Version | Alignment |
|---|---|---|
| **Floating Cities** (120 BPM, calm) | `out/alloy-idea-01-floating-cities.mp4`, `out/alloy-idea-01-1x1-floating-cities.mp4` | **Natural accent:** the lead pad enters on a bar downbeat at 8.04 s (mid band +8 dB after a one-bar swell). It's placed on **f60**, the ticker collapse, so the in-point is 6.04 s. |
| **Galactic Rap** (120 BPM, grooving) | `out/alloy-idea-01-galactic-rap.mp4`, `out/alloy-idea-01-1x1-galactic-rap.mp4` | **No single accent:** it's a steady two-bar loop from the start. It's cut on a bar line so a kick-heavy bar (4.026 s) lands on f60; the in-point is 2.026 s and every cut sits on the 120 grid. |
| Voltaic (120 BPM, alternate, lower priority) | `out/alloy-idea-01-voltaic.mp4`, `out/alloy-idea-01-1x1-voltaic.mp4` | The bar-9 kick-in at 16.042 s is on f60. Remixed at the same quieter target. |

**Credit line** (put the one for the posted cut in the X caption):
- `Music: "Floating Cities" by Kevin MacLeod (incompetech.com), CC BY 4.0`
- `Music: "Galactic Rap" by Kevin MacLeod (incompetech.com), CC BY 4.0`
- `Music: "Voltaic" by Kevin MacLeod (incompetech.com), CC BY 4.0`

**Licence proof:** screenshot incompetech.com's licence page (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/) into `audio/` with the download date, per DIRECTION §9. That's pending, from whoever downloaded the files.

## Flags for the Director / founder

- **Space Race is replaced by Conviction Bets (plum)** in the carousel. `cards-data/baskets.json` has no Space Race series or recipe, so its engraving and Alloy bar would have had to be invented. Conviction Bets is the real plum basket (MSTR 40 / TSLA 40 / NVDA 20). Swap it back once Space Race data exists.
- **Ledger values that aren't in COPY:**
  - The `STRATEGY` value is `Balanced` for AIB, PNS and CVB, and `Equal-weighted` for BTT (from its tagline).
  - Redemption ledger: `WHEN Any day` / `NETWORK FEE On us`.
  - Receipt: `PAID $5.00`.
- **The drift weights for the other stocks** shrink proportionally, as before.
- **S10 picker:** it now shows `NVDA AAPL SNDK TSLA` (all from our universe). The old AVGO/TSM/VRT tickers are gone.
- **Creator fee:** the video says only "Creators earn a fee." COPY.md's "earn 1%" should become 0.8% net (80/20 split).
- **The 1:1 product shots are scaled** about 0.55–0.75× to fit under the headline, so the smallest UI text is about 18–22 px in the square. The 50% square sheet shows this. If that's too small, the next step is a dedicated square layout (cropping the certificate to its figure and bar).

## Adding the music (slot)

**Track.** Put the licensed track in `audio/` (or `music/`) with `track.json`:

```json
{ "file": "track.mp3", "drop": 31.25, "bpm": 122 }
```

- `drop` is the time in the original file where the main drop hits; the build places it on **f60**.
- `bpm` within ±3% of 120 is conformed with `atempo`.
- The build gates the music to −30 dB for f645–f659, fades it out over the last 1.2 s, and masters both cuts to −14 LUFS / −1.5 dBTP.
- Tested with a throwaway tone: the drop landed at 2.000 s.

**Licensed SFX** (optional): put them in `sfx/` with `cues.json` (`[{"file", "frame", "db"}]`) and list their sources in `sfx/SOURCES.md`.

**Nothing in the audio is synthesized.** The silent cut (`alloy-idea-01.mp4`) is kept as well.

## Post copy (draft)

> Everyone says buy AI. Which stocks? Alloy turns the idea into one basket: pick a story, start with $5, and it stays on recipe by itself. Coming soon.
>
> Music: "Floating Cities" by Kevin MacLeod (incompetech.com), CC BY 4.0

(Swap in the title of whichever music cut is posted.)

First reply:

> Tokenized stock exposure, not shares. Not for US persons. Built on Base, not by Base. Waitlist: https://crates-ui.vercel.app
