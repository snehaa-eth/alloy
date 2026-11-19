# REVIEW 01: alloy-idea-01, first render

**Reviewer:** Director. **Date:** 2026-11-19.
**Render reviewed:** `out/alloy-idea-01-master.mp4`: 780 frames, 1080×1920, 30 fps, silent.
**How I reviewed it:**
- Contact sheet (every 15th frame).
- Full-res stills at f0, 30, 66, 90, 165, 195, 240, 262, 285, 330, 390, 480, 575, 630, 690, 720.
- Frame strips around the f60, f240 and f630 cuts.
- Everything again at 50% size (540×960).
- `budget.csv` and `words.json`.

## Verdict: **CHANGES REQUIRED**

**What works:**
- The skeleton is right: hook copy, story order, beat grid and end card.
- The hook reads at f0 with the sound off.
- Word counts ≤ 6 everywhere. Burgundy peaks at 3.8% and gold at 0.37%. No text in the unsafe areas.
- Zero dev content.

**What fails:**
1. **The UI isn't in our design language yet.** It's generic dark panels, not the v4 Certificate and Alloy bars.
2. **Every product shot is too small and top-heavy.** About 40% of the frame (y ≈ 1150–1640) sits empty from S2 to S11.
3. **The turn at f60 doesn't land.** It reads as a crossfade, not a collapse.
4. **The followers chart ends in a crash.**

Fix these and it's close.

---

## A. Global notes (apply to every shot)

**A1. Adopt the v4 look now:** `docs/design/cards-v4.html`, plus `cards-data/shots/cards-v4.png`, `components-v4-certificate.png` and `components-v4-alloy.png`.
- **Certificate:** sharp **4 px corners**, 1 px hairline frame, and this anatomy:
  - mono serial head (`No. 1591 · AIB`) with a stamp on the right (`BASKET` / `BUY` / `EXIT`),
  - a **guilloche engraving** in the basket's jewel tone, with a double hairline frame and corner rings,
  - a **2 px burgundy signature rule** under the engraving,
  - Inter 600 title, mono key, Anton figure,
  - the **Alloy bar**,
  - two ledger fields,
  - one square primary button,
  - a foot (underlined link left, mono meta right).
- **Alloy bar:** stacked jewel-tone bands, thickness = weight, 1 px gaps, a moving sheen. Legend in mono: `NVDA 35 MSFT 25 GOOGL 20 AMZN 12 META 8`. Rebalances show a **pair (now → after)**.
- **Never:** rounded black cards with dot-matrix wave headers and white pills (the "Penny" look). The current render isn't Penny, but it's anonymous. v4 is what makes it ours.
- **Swap in** `compHTML()`, `cover()` and the panel markup, as your README planned. The cover photos from `brand/covers/` are **retired** from this video. The guilloche engraving replaces them as the basket's identity.

**A2. Scale and composition.**
- In video, the certificate is **870 px wide at x 90–960**, so it respects the right-120 safe zone.
- Its **centre of mass sits at y 960–1000.**
- Headlines go in the y 200–420 band.
- The certificate fills **y 470–1560.** No product shot may leave more than 250 px of empty black between its last element and y 1640.
- Today S4 at f195 ends at y ≈ 1300 and S8 at f480 at y ≈ 1240. That's too small: at 50% size the UI text is 12–16 px and unreadable.

**A3. Type amendments to DIRECTION §8.**
- **Mono (JetBrains Mono) is now allowed**, but **only** for v4 certificate keys, serials, stamps and the Alloy-bar legend, at ≥ 30 px. It's still banned for anything that looks like a terminal.
- A frame may carry **two** Anton elements: the shot headline plus the certificate's one figure (as v4 specifies).
- Every UI text element must be ≥ 30 px at 1080 width. Today the panel titles ("Buy The AI Build-Out", "Get the stocks") are about 26 px and legends about 22 px. **Fail.**

**A4. Remove the burgundy radial glow behind the cards** (f66–f179). On the green Big Tech cover (f150) and around the card edges it reads as a red smudge in the contact sheet. The v4 signature rule is the burgundy moment now.

**A5. The step markers `1 / 2 / 3`** (f120, f180, f300) are 40 px grey and invisible at 50%.
- Replace them with a mono stamp left of the headline: `01/03`, `02/03`, `03/03`, 44 px, `#F2F0ED`, in a 1 px hairline box with 4 px corners.
- Or remove them. Don't leave them half-visible.

---

## B. Shot notes (frame-referenced)

**1. S1 hook, f0–f59.** Copy and pacing pass. Fix the wall:
- **Ticker collisions:** `LRCXSNPS`, `INTCAMZN`, `SNOWAMD`, `METAMSFT`, `ADBE TSLA PLTR` overlapping. Enforce ≥ 24 px clear space between tickers and re-seed the layout.
- **Flashes are too bright.** TXN, NOW, MSFT and SNPS hit near-paper at f0–f45 and compete with the headline. Cap flashes at `#9A9894`, and allow **no flashes within 80 px of the headline plate.**
- Flash only inside the live box (y 140–1640). The texture can bleed into the unsafe areas but can't flash there.

**2. S2 turn, f60–f72: the most important fix.** Today the wall shrinks and dissolves toward the centre and debris stays behind the card until about f80. KLAC, TXN, ANET and CSCO sit under the recipe labels at f66. Required:
- **f60–f66:** the **five basket tickers** (NVDA, MSFT, GOOGL, AMZN, META) stay **paper, 72 px, Inter 600**, and *travel* (spring, no overshoot, 3-frame motion trail) into the **exact positions of the Alloy-bar legend** on the landing certificate. The eye must follow them in.
- The other ~35 drop **out of frame** with `ease-in` and are **completely gone by f70.** No texture behind the certificate after f72.
- **f66:** the v4 **Holding certificate** lands (scale 1.04 → 1.00, 6 f). Its Alloy bar's bands **grow in from 0 thickness** f66–f75 as the tickers lock into the legend.

**3. S2 hold, f66–f119.** The recipe labels currently collide (AMZN over META at f66) and alternate above and below the strip. Use the v4 legend line instead (A1).
- **Ledger fields must not show returns.** The v4 sample shows `SINCE AUG 21 ▼ −11.4%`, and that must **not** appear in the video. Use:
  - `STOCKS 5` | `STRATEGY Balanced`.
- No gold here: `CREATOR IN` uses gold text, and gold belongs to S5 only.
- **Figure:** drop `VALUE PER TOKEN $8.86` in this shot. The figure slot shows `FROM` / `$5`. It plants the $5, and S4 pays it off.
- **Foot:** `See inside →` | `@kavya`.

**4. S3 carousel, f120–f179.** Each card becomes a v4 Holding certificate in its own tone, with its engraving and Alloy bar:
- **Space Race:** plum.
- **Picks & Shovels:** amber.
- **Big Tech, Trimmed:** emerald, AAPL/MSFT/GOOGL/AMZN/META at 20 each.
- **The AI Build-Out:** sapphire.

The four differently coloured bars are the colour moment of the piece. Centre the stack per A2. Keep the selection tap ring at f165.

**5. S4 buy, f180–f239.** Rebuild as the v4 **Buy Order** certificate (stamp `BUY`):
- `YOU PAY` figure **`$0.00` → `$5.00`** at f195. Remove the `test` unit that sits in the v4 sample.
- Ledger: `YOU GET ≈ 0.56 AIB` | `NETWORK FEE On us`.
- Primary: `Buy $5`. The press fill is f210–f229 (linear, accent bar under the button, as now).
- The presets `$5 · $25 · $100` stay as square chips above the figure.
- Keep the micro `Tokenized stock exposure, not shares.` at ≥ 30 px inside the certificate foot.

**6. f240–f254 dead frame and discontinuity.** The sheet vanishes and "You're in." floats alone on black for 15 frames. **Fail** (no dead air; jarring cut). Instead:
- the **same certificate** turns into its receipt in place,
- the stamp swaps `BUY` → `ISSUED`,
- the gold check ring draws in the engraving slot (f240–f257), with `You're in.` as the title.
- The figure becomes `0.56 AIB`.

**7. S5, f255–f299.** The five left-aligned blue bars leave the right 45% empty and aren't our motif.
- The `AIB` chip **expands into the 44 px Alloy bar** inside the receipt (bands stacked, f262–f274, one band every 3 f), with the mono legend underneath.
- The headline `ONE TOKEN. FIVE STOCKS.` stays.

**8. S6–S7 drift and trim, f300–f419.** At 50% size the 35 → 41 change is about 25 px of bar growth. **Nobody sees it.** Required:
- Show the drift on the Alloy bar *and* call it out.
- Dim the non-NVDA bands to 35% opacity, and give the certificate figure to NVDA: Anton **`35% → 41%`** ticking up f305–f335.
- The band edge is a **4 px warn line** with a mono tag `BAND 40` (not the current hairline dash, which is invisible).
- **f360–f380:** the v4 **rebalance pair** (now bar → after bar), with the figure resolving to `41% → 40%`.
- **f375:** ledger `REASON "NVDA ran ahead."` | `COST ≈ $0.05`.
- **f390:** `Every change has a reason.` stays as the caption.

**9. S8–S9 followers vs creator, f420–f539.** Two failures:
- **(a) The line crashes over the last 25% of the chart** (f450–f539). It's the real AI Build-Out window, which ends at −11%. On a launch teaser that reads as "this lost money", and it isn't the point of the shot.
- **(b) The creator's dashed line is invisible.** It sits under the follower line, so the "two lines, same chart" idea doesn't show.

**Fix:**
- Make it an explicit **illustration**: a gently rising-then-sideways path, with no drop larger than 4% of chart height in the last 30%.
- Draw the creator line (dashed `#9A9894`, 3 px) **visibly above** the follower line (solid paper, 3 px), with the gap widening to about 14 px by the end.
- Change the micro to **`Illustration. Past performance isn't a promise.`** (≥ 30 px).
- Use the v4 certificate shell with mono key `FOLLOWERS VS CREATOR` and Anton figure **`−0.6%`**, in place of the small chip.
- No axis values (as now).

**10. S10 creators, f540–f599.** Mostly fine.
- Make the weights row an **Alloy bar filling band by band** as each chip is ticked (25 → 50 → 75 → 100%). The legend reads `NVDA 25 AVGO 25 TSM 25 VRT 25`.
- The tone swatches should be square with 4 px corners (as now). The plum selection must land by f585.
- The background tickers AMD/ASML/MU/ARM/ORCL are fine at `#3A3A40`. Keep them.

**11. S11 exit, f600–f659.**
- Use the v4 **Redemption** certificate (stamp `EXIT`), with the figure `YOU RECEIVE · All` (no $ amount, which is fine).
- At f630 the foot link `Get the stocks instead →` is "pressed" (underline flash). The certificate flips to the in-kind face, and the five `…c` chips land in a `YOUR ACCOUNT` ledger row.
- Chips are ≥ 34 px text. Currently about 24 px: **fail** at 50%.
- The f645–f659 break hold passes (fully still). Keep it.

**12. S12 tagline, f660–f719.** The burgundy silk reads as a **brush swoosh** (generic, "Nike-ish") and cuts through the letterforms of `STORIES,` at f690–f705. **Remove it.**
- In its place, draw a full-width **Alloy bar** (44 px, five bands: sapphire, emerald, amber, plum, burgundy, each 20%) left to right under `NOT SYMBOLS.`, f690–f705, with the sheen pass at f705–f719.
- This is our brand motif (mixed metals = baskets), and burgundy stays under 2%.

**13. S13 end card, f720–f779. Approved as is,** with one continuity add: the S12 Alloy bar shrinks to 300 × 22 px and sits between `ALLOY` and `Stories, not symbols.`.
- `COMING SOON` gets 4 px corners and a 1 px hairline, matching the v4 stamps.
- The legal line at 28 px is acceptable for legal.

---

## C. Checklist scoring (DIRECTION §13)

| # | Item | Result |
|---|---|---|
| 1 | Hook ≤ 1 s | **PASS** |
| 2 | Idea lands sound-off | **FAIL**: drift (B8) and followers (B9) don't read at phone size |
| 3 | f60 turn lands | **FAIL** (B2) |
| 4 | ≤ 7 words | PASS (max 6) |
| 5 | One headline / one idea per shot | PASS |
| 6 | Cuts on beat | PASS (spot-checked f60, f240, f630) |
| 7 | 50% legibility | **FAIL**: UI text 22–26 px (A2, A3) |
| 8 | Real-app UI | **FAIL**: not v4 (A1) |
| 9 | Hard bans absent | PASS |
| 10 | Compliance legible, no return-as-gain | **FAIL**: the crashing chart reads as a return (B9) |
| 11 | Colour budgets | PASS (burgundy 3.8%, gold 0.37%) |
| 12 | Safe areas | PASS (texture-flash note in B1) |
| 13 | No dead air | **FAIL**: f240–f254 (B6) |
| 14 | Audio | PENDING (founder track choice), not blocking |
| 15 | Deliverables | **FAIL**: 1:1 cut not delivered yet |

## D. Next render

Deliver all of the following:
- `out/alloy-idea-01.mp4` (9:16) and `out/alloy-idea-01-1x1.mp4` (DIRECTION §11).
- A new contact sheet and posters f0 / f90 / f720.
- A 50%-scale contact sheet, so we both judge legibility on the same image.

Then I'll review again (REVIEW-02).
