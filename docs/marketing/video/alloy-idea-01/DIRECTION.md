# ALLOY IDEA 01: "Which stocks?". Director's treatment

**Owner:** Director (creative). **Builds it:** the production agent (HTML scenes → headless Chrome frames → ffmpeg).
**Status:** v1, 2026-11-19. This **replaces** the BUILD LOG 01 concept for video #1. `../build-log-01/` stays untouched as an archive.

**Founder note driving this rewrite:** "Video is ok but audio bad." Also, the concept was wrong: video #1 has to sell the **product idea** the way a marketer would.

**Hard bans for this video** (none of these may appear on screen or in the audio):
- terminals or code,
- `0xef`, Foundry, tests,
- "testnet", "live on testnet", "Base Sepolia",
- the mascot or the bust,
- synthesized music.

---

## 1. Logline

Everyone's told to "buy AI", and nobody knows which tickers. Alloy turns the idea into the investment: pick a story, start with $5, and the basket stays on recipe by itself. You can even see whether followers won too.

## 2. The single emotional beat

**Overwhelm → relief.** A wall of tickers you're supposed to understand collapses into one card with a name you do understand.

Everything after that card lands (f60) is proof that the relief is real: $5, auto-rebalanced, honest numbers, exit anytime. If a shot doesn't make "I get it, and I could do that" stronger, cut it.

## 3. Hook options (first second, sound off)

| # | Hook (on screen at f0) | Why it works | Risk |
|---|---|---|---|
| **H1 (PICK)** | **`EVERYONE SAYS BUY AI.`** → beat 2: **`WHICH STOCKS?`** over a flickering wall of AI tickers | AI is the theme retail already talks about. The tension is shared everywhere from Lagos to Jakarta. It reads in under a second, with no numbers to fact-check. It sets up "stories, not symbols" as the answer. | It's a question, but a real one, not an "Ever wondered…" opener (COPY §1 ban). |
| H2 | **`HE POSTED +212%.`** → **`DID HIS FOLLOWERS?`** | Crypto X knows this pain (KOL calls, copy-trading). It leads straight into our most distinctive feature (followers vs creator). | A return figure in frame 0 invites "is that you?" reads. It's better as the hook for **video #2** (the honesty angle). |
| H3 | **`$5.`** → **`THE WHOLE AI BUILD-OUT.`** | Pure offer, very direct. Robinhood-style simplicity. | No tension, so it's easy to scroll past. It also reads like an ad from frame 0. Keep it for a paid or retarget cut. |

**Decision: H1.** H2 is reserved for video #2 and H3 for an ads variant.

## 4. Format and grid

| Item | Spec |
|---|---|
| Master | 1080 × 1920, 9:16, 30 fps CFR, H.264 High, yuv420p, CRF ≤ 18, `+faststart`, AAC 48 kHz 192 kbps |
| Length | **26.0 s = 780 frames** at 120 BPM (13 bars). The acceptable range after conforming to the track is 24–28 s. |
| Second cut | **1:1, 1080 × 1080** (§11). There is also an optional **20 s cutdown** (§11). |
| Safe area (9:16) | No text in the **bottom 280 px**, **right 120 px**, **top 140 px** or left 60 px. Live box is x 60–960, y 140–1640. |
| **Square band** | Put every *story-critical* element inside **y 420–1500**, so the 1:1 cut is a reframe and not a redesign. Headlines can sit above it (y 180–400) because they get re-set in the 1:1 cut. |
| Grid | Cuts are timed in **beats of the chosen track** (§9). Frames below assume **120 BPM**: 1 beat = 15 frames, 1 bar = 60 frames. For another BPM, frame = round(beat × 1800 / BPM). Major cuts land on downbeats and minor ones on beats. Nothing lands off-beat except UI micro-motion. |

Bar map at 120 BPM:

| Bar | Frames | Seconds |
|---|---|---|
| B1 | 0–59 | 0–2 s |
| B2 | 60–119 | 2–4 s |
| B3 | 120–179 | 4–6 s |
| B4 | 180–239 | 6–8 s |
| B5 | 240–299 | 8–10 s |
| B6 | 300–359 | 10–12 s |
| B7 | 360–419 | 12–14 s |
| B8 | 420–479 | 14–16 s |
| B9 | 480–539 | 16–18 s |
| B10 | 540–599 | 18–20 s |
| B11 | 600–659 | 20–22 s |
| B12 | 660–719 | 22–24 s |
| B13 | 720–779 | 24–26 s |

## 5. Shot list

Conventions:
- **Sizes** are px on the 1080-wide canvas.
- **"Headline"** means Anton, uppercase, line-height 0.9, tracking +0.5%, `#F2F0ED`. There is **one headline per shot**.
- **"Caption"** means Inter 500/600, `#C9C7C3` or `#9A9894`.
- **UI** means real app components. Build them from `docs/design/cards-v3.html` ("Ten cards, one shape") and `components-v3.html`, with tokens from `TOKENS.md`. Product strings come from `COPY.md` §5, §7–§9 and §11 verbatim. Where I trimmed them, that's noted.
- **Remove from all UI:** "test dollars", "testnet" and any network badge (`cards-v3.html` contains "The AI Build-Out · test dollars"; drop that suffix).
- **Fix the cover cards' footer:** the `contact-sheet.png` card mocks say "Rebalanced monthly". **That's wrong for the product** (we trim on drift). Use `5 stocks · Balanced`.
- **Camera** is a transform on the scene root. All randomness is seeded.

### S1 HOOK (B1, f0–59): "EVERYONE SAYS BUY AI. WHICH STOCKS?"

- **Background, the ticker wall.** About 40 AI-adjacent tickers as **plain text**, Inter 600, 56–96 px, in a loose grid that fills the frame:
  - NVDA, AMD, AVGO, TSM, MSFT, GOOGL, META, AMZN, ORCL, ARM, SMCI, PLTR, MU, ASML, DELL, INTC, ANET, VRT, CRWV, SNOW, and so on.
  - Colour `#3A3A40` (texture, contrast ≤ 2:1, so it doesn't count toward the word limit).
  - Every 2 frames, 3 random tickers flash `#9A9894` for 2 frames.
  - The wall drifts upward at 1.5 px per frame.
- **f0 (already composed, no fade-in).** Headline 150 px, two lines centred at y 760: **`EVERYONE SAYS`** / **`BUY AI.`**. Behind it, a radial ink-bg plate (`#0A0A0A` at 85%, 1.4× the text box) keeps the wall from fighting the type.
- **f30 (beat 3).** **`WHICH STOCKS?`** hard-cuts in below at y 1060, Anton 150 px, `#F2F0ED`, with a 1.06 → 1.00 punch over 3 frames.
  - The flicker doubles: 6 tickers per 2 frames.
  - Cam micro-shake ±3 px, f30–f59, seeded. This is the anxiety.
- **f52–f59:** cam push 1.00 → 1.03, `ease-in`, into the cut.
- **Words on screen:** 6. **Colour:** none. Neutrals only.

### S2 THE TURN (B2, f60–119): many symbols → one story

- **f60, ON THE DROP.** The headlines cut out. All the tickers turn into particles and **fly to the centre** over 12 frames (spring, stiffness 400, damping 38, no overshoot).
  - The **five that are actually in the basket** (NVDA, MSFT, GOOGL, AMZN, META) turn `#F2F0ED` and land *inside* the card.
  - The other ~35 fall out of frame downward (`ease-in`, 10 frames) and fade out.
  - **This is the metaphor.** A creator already picked the five that fit the idea.
- **f66: the card lands** at centre (540, 900), 900 × 506 px, using the 16:9 cover `apps/web/public/brand/covers/ai-build-out.png`, radius 12, 1 px `#26262A` border, 60% bottom scrim.
  - On the cover, Inter 600, 52 px: `The AI Build-Out`
  - Below that, Inter 500, 34 px, `#C9C7C3`: `Chips and the clouds renting them`
  - Footer row inside the card, Inter 500, 30 px, `#9A9894`: `5 stocks · Balanced`
  - The card lands at scale 1.04 and settles to 1.00 over 6 frames, with a soft impact (§10).
- **f90 (beat 3).** Headline 140 px at y 300: **`BUY THE WHOLE IDEA.`** (4 words)
- **f66–f119:** slow push 1.00 → 1.025.
- **Colour:** sapphire cover (jewel tone), glow `rgba(109,0,26,.35)` behind the card (doesn't count toward the budget).

### S3 BEAT ① PICK A STORY (B3, f120–179)

- **f120.** Headline 120 px at y 300: **`PICK A STORY.`** A small step marker sits left of it, Inter 600, 40 px, `#9A9894`: `1`.
- **Carousel.** One card per beat, a horizontal slide of 1080 px over 6 frames (`ease-out`) with a 4-ghost motion smear and a soft whoosh (only on f120 and f165, §10).
  - f120: **Space Race** (plum) · `Launch, satellites, defence`
  - f135: **Picks & Shovels** (amber) · `Chips, power, tooling`
  - f150: **Big Tech, Trimmed** (emerald) · `Megacaps, equal-weighted`
  - f165: back to **The AI Build-Out** (sapphire). A tap ring (`#C41A42`, 2 px, 0 → 80 px, 10 frames) and a click mark it selected.
- **Capitol Tech is excluded on purpose.** It's a story basket and would need the "public disclosures dated X, not affiliated" line legible on screen. Its burgundy cover would also eat the 10% budget at this size. It gets its own video.
- **Colour:** each cover's jewel tone changes per beat. That's the colour moment of the piece.

### S4 BEAT ② START WITH $5 (B4, f180–239)

- **f180.** Headline 120 px at y 300: **`START WITH $5.`** Step marker: `2`.
- The selected card shrinks to a 64 px tile plus its name at the top of a **Buy sheet**. The sheet rises from y 1920 to y 560 over 8 frames (`spring-sheet`: stiffness 520, damping 46). The sheet surface is `#0F0F10` with 20 px top radius.
  - The sheet's lower area may run into the bottom 280 px, but **no text goes below y 1640**.
- **Sheet content** (COPY §7, trimmed):
  - Title, Inter 600, 44 px: `Buy The AI Build-Out`
  - Amount, Inter 600 tnum, 160 px: starts at `$0`
  - Presets as pills, Inter 600, 40 px: `$5 · $25 · $100`
- **f195:** the `$5` preset is tapped. The pill fills `#F2F0ED` with `#0A0A0A` text, there's a click, and the amount swaps to `$5` with a 120 ms fade (MOTION: "money stays still while you decide").
- **f210–f229:** the button `Hold to buy $5` (52 px tall, `#F2F0ED` fill, `#0A0A0A` text, Inter 600, 40 px) shows its hold fill, a **linear** `#C41A42` progress bar along the bottom edge of the button.
- Micro line in the sheet, Inter 500, 28 px, `#9A9894`: `Tokenized stock exposure, not shares.` This is the compliance line, and it must be legible in the poster check.

### S5 BEAT ② CONT. ONE TOKEN HOLDS IT ALL (B5, f240–299)

- **f240.** The sheet turns into its success state. A **gold check ring** (`#C9A96E`, 8 px stroke, 140 px) draws over 18 frames at y 640. **This is the only gold in the video** (≈1.3%).
  - Inter 600, 64 px: `You're in.`
- **f255.** One basket-token chip (Inter 600, 40 px, `AIB`, sapphire-deep pill) sits at y 860. On f262 it **unfolds into five weight bars**, one bar every 3 frames:
  - NVDA 35%, MSFT 25%, GOOGL 20%, AMZN 12%, META 8% (from `cards-data/baskets.json`).
  - Bars are 720 px max width and 36 px tall, filled with the sapphire mid `#3E6FB8` at 70%.
  - Labels are Inter 600, 36 px tnum, `#F2F0ED`.
- **f270.** Headline 120 px at y 300: **`ONE TOKEN. FIVE STOCKS.`** (4)
- **Words:** headline 4 + `You're in.` 2 = 6. The bar labels are UI.

### S6 BEAT ③ PRICES DRIFT (B6, f300–359)

- **f300, hard cut.** The bars stay and the success UI clears. Headline 120 px at y 300: **`PRICES DRIFT.`** Step marker: `3`.
- **f305–f335:** the NVDA bar grows 35% → 41% (`ease-in-out`, 30 frames) while the others shrink proportionally. A dashed **warn** line (`#F2B33D`, 2 px, 8/6 dash) marks the band edge at 40% on the NVDA row.
- **f335:** NVDA crosses the line. The line pulses (opacity 1 → 0.4 → 1, 6 frames) with a soft tick.

### S7 BEAT ③ CONT. WE TRIM IT BACK (B7, f360–419)

- **f360.** Headline swap: **`WE TRIM IT BACK.`** (4)
- **f360–f380:** NVDA 41% → 40% (`dur-morph` 700 ms = 21 frames, `ease-in-out`). The other bars nudge back up.
- **f375:** the **Trim card** from `cards-v3.html` ("Back inside the band · The AI Build-Out") slides up into y 1180–1460:
  - `NVDA 41% → 40%`
  - `Reason: NVDA ran ahead.`
  - Inter 600, 38 px and Inter 500, 34 px.
- **f390:** the headline **cuts out** and a caption takes over, Inter 500, 40 px, `#C9C7C3`, y 1540: `Every change has a reason.` (5 words; the headline and caption are never on screen together).
- **Colour:** neutral bars, the warn line, and the sapphire bar fill. No burgundy.

### S8 TRUST: DID FOLLOWERS WIN TOO? (B8, f420–479)

- **f420.** Headline 120 px at y 300: **`DID FOLLOWERS WIN TOO?`** (4)
- **Chart card** (the cards-v3 "followers vs creator" shape, 900 × 600, centred at y 900):
  - The **creator line** is dashed `#9A9894` and the **follower line** is solid `#F2F0ED`. Both draw left to right, f425–f455 (`dur-draw`, `ease-in-out`).
  - Area fill under the follower line: sapphire mid 18% → 0%.
  - **No y-axis values, no % gain labels.**
  - Legend, Inter 500, 32 px: `— Followers  - - Creator`.

### S9 TRUST CONT. SAME CHART (B9, f480–539)

- **f480:** a chip appears on the chart, Inter 600, 40 px tnum, on `#1C1C1F`: **`Followers −0.6% vs creator`**. That's a **gap**, not a return (COPY §1 trim example).
- **f480.** Headline swap: **`SAME CHART. NO HIDING.`** (4)
- **Micro** in the card, Inter 500, 28 px, `#9A9894`: `Example basket. Past performance isn't a promise.` It's mandatory and must be legible at 100%.
- **f480–f539:** cam push 1.00 → 1.02. This is the **breath shot** of the piece, so motion is calm here.

### S10 CREATORS (B10, f540–599)

- **f540.** Headline 140 px at y 760: **`GOT A THESIS?`** The ticker callback runs behind it: a few faint tickers at `#3A3A40` slide in.
- **f555–f585:** four stock chips toggle on, one per 8th: `NVDA` `AVGO` `TSM` `VRT`, each with a `+` → `✓` and a soft click. A weights row fills to `100% ✓`. The cover tone picker lands on **plum**.
- **f570.** Headline swap: **`BOTTLE IT.`** Plus caption Inter 600, 48 px, `#C9C7C3`, y 1180: **`Creators earn a fee.`** (2 + 4 = 6)
- **Fact note:** the fee is 1%/yr split 80/20, so the creator nets 0.8%. **Don't write "earn 1%"** (COPY.md's landing copy says it, and that should be fixed separately).
- **Cuttable** for the 20 s version.

### S11 EXIT ANYTIME (B11, f600–659)

- **f600.** Headline 150 px at y 300: **`EXIT ANYTIME.`**
- **f605–f625:** the cards-v3 Sell card. The slider thumb sweeps 0 → **All** (linear, 20 frames) and the readout ticks with digit roll (allowed: this is passive viewing, not a decision).
- **f630–f645:** the "Get the stocks" card. The basket token splits into **5 stock token chips** (`NVDAc` `MSFTc` `GOOGLc` `AMZNc` `METAc`) that fly into an "Your account" row, 3 frames apart.
- **Caption** f630, Inter 600, 48 px, `#C9C7C3`, y 1520: **`Or take the stocks.`** (2 + 4 = 6)
- **f645–f659: MUSIC BREAK** (§10). The picture holds still: no motion, just the 4% grain. This is the only stillness in the piece.
- **Cuttable** for the 20 s version.

### S12 TAGLINE (B12, f660–719)

- **f660 (the music returns on the downbeat).** Black.
  - Headline 170 px, left-aligned at x 90, three lines, each a hard cut on a beat:
    - f660: **`INVEST IN`**
    - f675: **`STORIES,`**
    - f690: **`NOT SYMBOLS.`**
  - Each line punches 1.05 → 1.00 over 3 frames.
- **Silk band:** one CSS/SVG satin ribbon in `#6D001A`, highlights ≤ `#8C1230`. It sweeps left to right behind `STORIES,` from f675 to f700, then rests as a diagonal band at **≤ 8% of the frame**.
  - No silk asset exists in the repo yet (checked `apps/web/public/`). Build it as an SVG path with a linear gradient and a 2 px highlight stroke. No raster AI art.
- **f700–f719:** cam push 1.00 → 1.03.
- **Words:** 5.

### S13 END CARD (B13, f720–779)

- **f720, hard cut on the downbeat.** One soft impact.
  - **`ALLOY`**: Anton 280 px (26%), `#F2F0ED`, centred at y 780.
  - **`Stories, not symbols.`**: Inter 500, 48 px, `#C9C7C3`, y 960.
  - **`COMING SOON`**: pill with a 2 px `#F2F0ED` outline, Inter 600, 40 px, tracking +8%, y 1110. Its border pulses once at f750.
  - **`@alloy_fi`**: Inter 600, 44 px, `#9A9894`, y 1220.
  - **Legal**: Inter 500, 28 px, `#9A9894`, y 1560 (above the unsafe zone): `Tokenized stock exposure, not shares. Not for US persons.`
- **Words:** 1 + 3 + 2 = 6. The handle and legal line are exempt.
- **f720–f779:** static apart from grain. A static end card is easy to screenshot.
- **Loop:** X replays it. The cut from f779 back to f0's ticker wall works as a reset. No special loop build needed.

## 6. Pacing curve (energy 0–10)

```
bar:  B1 B2  B3 B4 B5 B6 B7 B8 B9 B10 B11   B12 B13
       7 10   9  8  7  7  8  6  4   7  6→1   10   5
          ^drop                          ^break ^tagline
```

- Average shot length is about 1 s in S3 and about 2 s elsewhere.
- No shot holds longer than 2.5 s without a new element.
- The two lows (S9 breath and the S11 break) each sit right before a peak.

## 7. Money shot and poster

- **Money shot: f90.**
  - "BUY THE WHOLE IDEA." over the AI Build-Out card.
  - The five tickers sit bright inside the card, with the faded ticker debris above.
  - It holds the whole product idea in one frame.
- **Poster / first frame: f0** ("EVERYONE SAYS / BUY AI." over the ticker wall). It must stand alone as a thumbnail.
- **Exports:** `out/poster-f0.png`, `out/poster-f90.png`, `out/poster-f720.png`.

## 8. Typography and colour rules

1. **Faces:** Anton for the one headline per shot, Inter for everything else. **No mono anywhere.**
2. **At most 3 type sizes per frame**, excluding the UI inside cards. Minimums:
   - headline ≥ 110 px,
   - captions ≥ 40 px,
   - UI ≥ 30 px,
   - micro/legal ≥ 28 px and always redundant or compliance-only.
3. **≤ 7 headline + caption words on screen at once.**
   - UI text inside a real app card is exempt, but each card shows at most a name, one line and one number cluster.
   - Ticker-wall texture at ≤ 2:1 contrast is exempt.
4. **Colour budgets:**
   - Burgundy family (`#6D001A`, `#C41A42` and shades) ≤ 10% per frame.
   - Gold ≤ 3%, and only the S5 check ring.
   - Jewel tones come **only from basket covers and their fills**.
   - Gain/loss colours are not used at all (we show no returns).
5. **Grain** 4% monochrome on every frame. **Vignette** 18%.
6. **Motion:**
   - Hard cuts or ≤ 8-frame moves.
   - Springs never overshoot (MOTION.md `spring-sheet`).
   - No letter-by-letter fades, no karaoke captions, no bounce.

## 9. Music: royalty-free track spec (no synthesized music)

The founder picks a track; production conforms the cut to it.

**Primary brief (PICK): minimal dark tech-house / bass-house groove.**
- **BPM:** 118–124. Production conforms to exactly 120 with `atempo` or `rubberband`, which keeps pitch, but **only within ±3%**. Outside that range, re-time the beat grid instead.
- **Key/mood:** minor, confident, premium, restrained.
  - A tight kick, a deep sub, a muted pluck or stab, crisp hats.
  - **No vocals** (or only a wordless chop), no supersaw, no euphoric drop.
  - Think the bed of a Vercel or Linear launch film, or an Apple product-page loop, not a festival.
- **Structure:**
  - A **filtered or sparse intro of 1–2 bars**, then a **clear drop on a downbeat**.
  - A section that runs at least 12 bars after the drop without a breakdown.
  - Ideally a natural 1-beat stop we can use for the S11 break. If there isn't one, production makes it by gating the music for 15 frames (allowed: Pixabay's licence permits edits).
- **In-point:** set the track start so **its main drop lands on f60**, i.e. in-point = drop time − 2.000 s at 120 BPM. If the intro is too long, cut it on a bar line.
- **Out:** f720 is a downbeat hit. Then either the track's own tail or a 1.2 s `afade` out ending at f779. **No mid-phrase chop at the end.**

**Alternate B: Afro-house / amapiano-lite, 112–118 BPM.**
- Log-drum bass, shakers, warm keys. Speaks to Lagos, Johannesburg, Mumbai and Jakarta feeds.
- If picked, **re-time the grid**: 1 beat = 1800 / BPM frames, rounded per event. Don't stretch it to 120.

**Alternate C: cinematic hybrid trap, 140–150 BPM half-time.**
- 808 sub, sparse hats, one riser into the drop. More "crypto X".
- Grid on the half-time beat (70–75).

**Reject on sight:**
- phonk (the AI-template sound),
- corporate ukulele or "inspiring" piano,
- lo-fi study beats,
- EDM festival drops,
- any track with lyrics in English (they compete with on-screen words).

**Where to search, and the licence notes.** Keep a PDF or screenshot of the licence page in `alloy-idea-01/licence/` with the track URL and download date.

| Library | Search terms | Licence (verify on the day) | Verdict |
|---|---|---|---|
| **Pixabay Music** (pixabay.com/music) | "tech house minimal", "dark minimal beat", "deep house groove", "afro house", "amapiano", "hybrid trap cinematic"; filter 1–3 min | Pixabay Content License: free for commercial use, **no attribution required**. Pixabay itself warns some tracks may trigger **Content ID** claims (a YouTube system; not an X takedown, but keep the licence proof). [Pixabay FAQ](https://pixabay.com/service/faq/), [IP explainer](https://pixabay.com/ko/blog/posts/intellectual-property-explained-441/) | **Recommended.** Cleanest for a brand account. |
| **Uppbeat** (uppbeat.io) | Same terms, plus their "Tech", "Corporate Dark" and "Afrobeats" moods | Free plan: a few downloads a month (Uppbeat says 3; some third parties say 10, **unverified**) and **attribution required** (credit in the post/reply). Third-party write-ups say free is for individual creators and **brand/business use needs a paid plan (unverified)**. [Pricing](https://uppbeat.io/pricing), [comparison](https://licenseorg.com/guide/music-audio/uppbeat) | Use only if the founder buys a paid plan. @alloy_fi is a business account. |
| **YouTube Audio Library** | n/a | Standard tracks are licensed for **YouTube videos**; use on X is not clearly allowed. **CC BY** tracks may be used elsewhere with artist attribution. [licenseorg guide](https://licenseorg.com/guide/music-audio/youtube-audio-library) (unverified) | **Avoid**, unless it's a CC BY track credited in the first reply. |

**Founder action:** shortlist 3 tracks per the primary brief (BPM 118–124, drop within the first 30 s). Drop the MP3s and licence screenshots into `alloy-idea-01/music/`. The director picks one after a rough-cut sync test.

## 10. Sound-design accents (cue sheet)

All SFX come from **Pixabay Sound Effects** (same licence) or a CC0 source. **Nothing is synthesized.** SFX sit **under** the kick and never mask the drop.

| Frame (@120) | Cue | Spec |
|---|---|---|
| f0–f59 | Ticker flutter | A "split-flap / departure board" or fast paper-flutter loop, LP 6 kHz, −22 dB, getting denser at f30. Hard-cut at f60. |
| f30 | Tension tick | Single dry clock tick or wood block, −16 dB. |
| f45–f59 | Riser | **Only if the track's intro has no build.** Reverse cymbal or noise riser, hard stop at f59. |
| f60 | Drop | The track's drop. Add a soft **sub impact** (−10 dB, short tail) as the particles collapse. |
| f66 | Card land | Soft low thud / "UI impact soft", −14 dB. |
| f120, f165 | Whoosh | Short airy whoosh (< 250 ms), LP 8 kHz, −18 dB. **Only these 2 whooshes** in the whole carousel. The other swaps ride the hats. |
| f165 | Select | UI tap click, −14 dB. |
| f195 | $5 tap | Crisp UI click, −12 dB. |
| f210–f229 | Hold to buy | A subtle rising tonal swell ("UI hold / charge"), −20 dB, ending on f229. |
| f240 | Success | Soft two-note chime (not a cash register, not coins), −14 dB. |
| f262–f274 | Bars unfold | 5 tiny ticks, −22 dB, 3 frames apart. |
| f335 | Band cross | Soft tick, −18 dB. |
| f360–f380 | Trim snap | Single satisfying "snap/latch", −14 dB, landing on f380. |
| f425–f455 | Line draw | Faint pen/swipe texture, −26 dB (optional). |
| f555–f585 | Chip toggles | 4 soft clicks on 8ths, −18 dB. |
| f605–f625 | Slider | Short "zip", −18 dB. |
| f630–f645 | Stocks out | 5 light pops, −20 dB. |
| **f645–f659** | **MUSIC BREAK** | Gate the music to silence for 15 frames (1 beat). Keep only a −30 dB room-tone tail so it doesn't sound like a dropout. |
| f660 | Tagline | Music back on the downbeat. Optional soft impact under `INVEST IN`, −12 dB. |
| f720 | End card | One soft impact (the same family as f66), then the music tail or fade. |

**Mix:**
- Master at **−14 LUFS integrated**, **−1 dBTP**.
- Music sits around −16 LUFS short-term under the busier UI sections.
- Duck the music 3 dB under the S4–S5 UI clicks (sidechain, 150 ms release).
- Check on a phone speaker at 50% volume: the kick and the clicks must still read, and nothing should be harsh above 6 kHz.

## 11. Alternate cuts

- **1:1 (1080 × 1080):**
  - Take the y 420–1500 band of each shot, then **re-set the headlines** at the top of the square (y 70–230), Anton at **0.8×** size.
  - Captions go to the bottom (y 920–1010). Keep a 60 px margin all round, and keep the bottom 100 px clear for player chrome.
  - The S4 buy sheet becomes a floating card (radius 20), not a bottom sheet.
  - The end card stacks ALLOY at 220 px, then tagline, then pill, then handle. Legal sits at y 1000.
- **20 s cutdown:** drop S10 (creators) and S11 (exit). Move the music break to the last beat of S9 (f525–f539 → re-timed). The end card follows the tagline. Exit-anytime moves into the post copy.

## 12. Compliance in frame (ARCHITECTURE §7, COPY §1)

- On screen:
  - `Tokenized stock exposure, not shares.` (S4 sheet micro and the end card)
  - `Not for US persons.` (end card)
  - `Example basket. Past performance isn't a promise.` (S9)
- **No return figures as gains.** The only % values are recipe weights, drift (41% → 40%) and the follower gap.
- **No Base or Coinbase names or logos**, and no blue square. Tickers are plain text and there are no company logos.
- No "backed by", "partnered with" or "powered by".
- **Post copy / first reply** carries: "Built on Base, not by Base." Plus the waitlist link (the link goes in the reply, not the post).

## 13. Banger checklist (pass/fail on every render)

1. **Hook ≤ 1 s:** f0 alone reads "EVERYONE SAYS BUY AI." No logo and no fade-in.
2. **The idea lands with the sound off.** A cold viewer who watches once, muted, can say "baskets of US stocks around one idea, from $5, rebalanced for me, and I can see if followers won."
3. **The turn at f60 lands.** The ticker wall collapses into one card exactly on the music drop (±0 frames), and the five basket tickers are visibly the ones kept.
4. **≤ 7 headline + caption words** on every frame (sampled every 5th frame).
5. **One headline per shot** and one idea per shot. No shot needs a second read.
6. **Every cut on a beat** of the conformed track. Major events sit on downbeats: f0, f60, f120, f180, f240, f300, f360, f420, f480, f540, f600, f660, f720.
7. **Legibility at 50% size** (540 × 960 on a phone): headlines ≥ 110 px, captions ≥ 40 px, UI ≥ 30 px.
8. **UI looks like the real app.** Components come from `cards-v3.html` / `components-v3.html` with TOKENS colours and COPY strings. No lorem, no fake numbers outside COPY/cards-data, and no "test dollars" or "testnet" anywhere.
9. **Hard bans absent:** no terminal, code, `0xef`, Foundry, tests, testnet or mascot.
10. **Compliance lines are present and legible**, with no return-as-gain number and no Base/Coinbase mention or logo.
11. **Colour budgets:** burgundy ≤ 10% and gold ≤ 3% on every sampled frame. Exactly one gold element (S5).
12. **Safe areas:** zero text pixels in the bottom 280, right 120 or top 140 (automated mask check).
13. **No dead air:** nothing is static for more than 0.5 s except the deliberate S11 break (15 f) and the end card. No shot holds longer than 2.5 s without a new element.
14. **Audio is a real track, licensed, with proof filed.** −14 LUFS ±1 and ≤ −1 dBTP. The drop is on f60. SFX are audible but under the kick. **It sounds like a produced ad, not beeps.** Phone-speaker test passes.
15. **Deliverables:** 9:16 at 24–28 s and 1:1 at the same length, both passing items 1–14. Posters f0, f90 and f720 exported.

## 14. Three ways this goes cringe / AI-ish (instant reject)

1. **Stock-market clichés.** Green candlesticks, money rain, coins, rockets or moons, "to the moon", a cash-register sound, glowing Base-blue tech, AI-generated people smiling at phones.
2. **Hype copy.** Anything on the COPY.md banned list ("unlock", "revolutionize", "the future of", "democratize", "effortless"), exclamation marks, "Join the revolution", or a fake "+212%" gain as if it were ours.
3. **Template motion and sound.** Every element springing in with overshoot, karaoke word-by-word captions, a whoosh on every cut, phonk or ukulele beds, or iPhone mockups spinning in 3D. One whoosh pair, one break, one silk sweep: restraint is the premium signal.

## 15. Deliverables (in `alloy-idea-01/`)

- `out/alloy-idea-01-9x16.mp4`, `out/alloy-idea-01-1x1.mp4`, and optionally `out/alloy-idea-01-20s-9x16.mp4`.
- `out/poster-f0.png`, `out/poster-f90.png`, `out/poster-f720.png`, plus `out/contact-sheet.png` (every 15th frame with the safe-area mask and the square band overlaid).
- `out/budget.csv`: per sampled frame, burgundy %, gold %, text-in-unsafe-area and on-screen word count.
- `music/`: chosen track and licence proof. `sfx/`: each SFX file plus a `SOURCES.md` listing URL and licence per file.
- A note listing any COPY string trimmed for the video, and anything flagged for the founder (for example the "earn 1%" vs 0.8% creator-fee wording).
