# BUILD LOG 01: "A stock with no code". Director's treatment

**Owner:** Director (creative). **Builds it:** the production agent (HTML scenes → headless Chrome frames → ffmpeg).
**Status:** v1, 2026-11-19. This is the brief. Renders are judged against the **Banger checklist** (§12). Notes will come back until every box passes.

> Rule zero: **every value shown in a terminal must come from a real capture in `captures/`.** We truncate long addresses with `…`, but we never retype, invent or "clean up" output. If the real output doesn't support a line of copy, the copy changes, not the output.

---

## 1. Logline

A tokenized NVIDIA stock on Base has exactly one byte of code, `0xef`. That byte broke every test we wrote. Base's own Foundry fixed it, and now an Alloy basket holds those stocks live on testnet. 32 seconds, terminal as the hero, all type, no face.

## 2. The single emotional beat

**"Wait, what?" → "oh, it works."**
The viewer sees something that shouldn't be possible: a real stock with one byte of code. The tests go red, the screen goes black and silent, then the screen floods green.
Everything serves that **red → silence → green** turn at 10.33 s → 13.33 s. If a shot doesn't build toward it or pay it off, cut it.

## 3. Format and grid (non-negotiable)

| Item | Spec |
|---|---|
| Canvas | 1080 × 1920, 9:16, 30 fps, H.264 High, yuv420p, CRF ≤ 18, `+faststart` |
| Length | **32.00 s = 960 frames** (f0–f959) |
| Music grid | **90 BPM, 4/4.** 1 beat = **20 frames**, 8th = 10 f, 16th = 5 f, 1 bar = 80 f. 12 bars total. Every cut lands on a multiple of 5 frames, and every *major* cut on a multiple of 20. |
| Safe area | Keep text out of the **bottom 280 px** (y > 1640), the **right 120 px** (x > 960), the **top 140 px** (X's close/back overlay) and the left 60 px. **Live box: x 60–960, y 140–1640, centre (510, 890).** Optical centre for hero type is **y ≈ 820**, slightly above the live box's centre. |
| Audio | 48 kHz stereo, AAC 192 kbps. Master to **−14 LUFS integrated, −1.0 dBTP**. Original synthesis only (§9). |

Bar map, used everywhere below:

| Bar | Frames | Seconds |
|---|---|---|
| B1 | 0–79 | 0.00–2.63 |
| B2 | 80–159 | 2.67–5.30 |
| B3 | 160–239 | 5.33–7.97 |
| B4 | 240–319 | 8.00–10.63 |
| B5 | 320–399 | 10.67–13.30 |
| B6 | 400–479 | 13.33–15.97 |
| B7 | 480–559 | 16.00–18.63 |
| B8 | 560–639 | 18.67–21.30 |
| B9 | 640–719 | 21.33–23.97 |
| B10 | 720–799 | 24.00–26.63 |
| B11 | 800–879 | 26.67–29.30 |
| B12 | 880–959 | 29.33–31.97 → loops to f0 |

## 4. Reference styles (what we steal, what we refuse)

All of these are **(unverified)**. They come from secondary write-ups I read during research; I have not watched them frame by frame. Use them for direction, not as specs.

| # | Reference | Steal | Refuse |
|---|---|---|---|
| R1 | **Coinbase Super Bowl QR (2022).** One strange object on black, pure curiosity. [MediaPost](https://www.mediapost.com/publications/article/371166/coinbases-super-bowl-qr-code-ad-crashed-the-app.html) | One weird object fills frame 0: our `0xef`. No logo, no explanation for the first second. | n/a |
| R2 | **Arc browser launch (2024).** One problem, stated plainly. [Off Menu](https://offmenu.substack.com/p/three-reasons-arcs-launch-video-went) | One problem, one fix. Dry and self-aware ("ONE BYTE."). | Skits. We have no faces. |
| R3 | **Linear launch films (e.g. Asks).** The story is one recognisable change. [Open Design analysis](https://open-design.ai/blog/product-launch-video-storytelling/) | One idea per viewport. Restraint. Calm type on near-black. | Feature montage. |
| R4 | **Vercel Ship openers** by basement.studio: kinetic type on black, monochrome, grid. [basement: Behind the Ship](https://basement.studio/post/behind-the-ship), [Vercel motion-designer role: kinetic type for openers](https://outscal.com/job/motion-designer-brand-at-vercel-in-san-francisco-california-united-states-of-america) | Hard cuts on the beat. Type is the set. Big negative space. | 3D globes and heavy WebGL spectacle we can't do at quality. |
| R5 | **Terminal-as-hero X launch template** (Remotion "Launch video on X" prompt by @ghumare64). [remotion.dev](https://www.remotion.dev/prompts/launch-video-on-x) | Open on a real command. Typed characters drive the rhythm. | macOS traffic-light window chrome, 3D-tilted windows, an 8-scene feature tour, and a licensed phonk track. All of it reads as template. |
| R6 | **Fireship "in 100 seconds".** Dense, fast, dry humour, and a numbered series people binge. [Engineer's Codex](https://read.engineerscodex.com/p/how-fireship-became-youtubes-favorite) | "BUILD LOG 01" works as a numbered series. Every shot adds new information. | Meme inserts. |
| R7 | **Beat-sync / glitch / audio-reactive short-form (2026).** [CapCut trending transitions](https://www.capcut.com/help/capcut-transitions), [OpusClip: 11 aesthetics](https://www.opus.pro/blog/editing-aesthetics-dominating-short-form-2026) | Cuts on the beat, RGB-split glitch used *only* on failure, visuals that react to the audio (the bells). | Brainrot pacing (a cut every 0.6–0.8 s). Our average shot is about 1.3 s. Same writers say beat-sync alone is now "table stakes", so it can't be the idea. |
| R8 | **Silence as impact:** Apple's silent AirPods/Vinícius Jr spot. [Auralcrave](https://auralcrave.com/en/2026/06/26/why-apples-vinicius-jr-airpods-commercial-has-no-music-and-how-the-internet-is-filling-the-void/) | One hard digital silence right before the turn (§9, f310–f319). | Long silence. Ours is 10 frames, never more. |

## 5. Shot list

Conventions:
- **Sizes** are px on the 1080-wide canvas, with % of frame width in brackets.
- **Positions** are the centre of the text block unless stated.
- **"Cam"** means a transform on the scene root: `translate`/`scale`/`rotate`. Every random value comes from a seeded PRNG, so renders are deterministic.
- **Persistent chyron (f0–f959, except f310–f319 black):** top-left at x 60, y 168. Inter 600, 36 px (3.3%), tracking +8%, `#9A9894`: `BUILD LOG 01`. A 10 px `#C41A42` square sits 14 px to its left and blinks on every downbeat (on for 10 frames, off for 70).

### S1 HOOK: "0xef" (B1, f0–f79)

- **f0 is the money shot and the poster** (§7). The frame is already composed; nothing fades in.
  - Kicker at y 520: Inter 600, 52 px (4.8%), `#F2F0ED`: **`NVIDIA, tokenized on Base.`**
  - Command at y 640: JetBrains Mono 400, 40 px, `#9A9894`. The prompt `$` is `#C41A42`: **`$ cast code 0xb200…108C`** (real address from `captures/01`, truncated with `…`).
  - Hero at y 860: JetBrains Mono 400, **340 px (31%)**, `#F2F0ED`: **`0xef`**. That's about 816 px wide, so it fits the live box.
  - A radial glow sits behind the hero: `rgba(109,0,26,.35)`, 2.5× the hero's width (TOKENS §10.5; it doesn't count toward the burgundy budget).
- **f1–f3, impact.**
  - Hero scale 1.00 → 1.045 at f1, then back to 1.00 by f3.
  - RGB split on the hero only: a duplicate layer in `#C41A42` at +6 px x and one in `#F2F0ED` at −6 px x, at 60% opacity. Gone at f3.
- **f1–f8, shake.** Cam translate ±12 px (seeded random, x and y), decaying exponentially to 0 at f8. Cam rotate ±0.4°.
- **f40 (beat 3).** Under the hero at y 1110, Anton 150 px (13.9%), `#F2F0ED`: **`ONE BYTE.`**
  - It hard-cuts in at scale 1.08 and settles to 1.00 by f44 with `ease-out` (`cubic-bezier(0.2,0.8,0.2,1)`).
  - Cam shake ±4 px, f40–f44.
- **f44–f79.** Slow push: cam scale 1.00 → 1.025, linear.
- **Words on screen:** 6 (the command line is exempt, §8).
- **Colour:** paper on black. Burgundy is only the `$` mark, the chyron square and the glow (<1%). No gold.

### S2 PROOF: "it's real" (B2, f80–f159)

- **f80, whip up.** The hero group (command, `0xef` and `ONE BYTE.`) moves to y 300 and scales to 0.42 over **6 frames** (f80–f85), `ease-out`. Add a 3-frame vertical motion-blur smear: 4 ghost copies at 12% opacity trailing the move. The kicker cuts out at f80.
- **Terminal block** (left-aligned at x 90, from y 700): JetBrains Mono 40 px, line-height 1.5. These are real lines from `captures/01`:
  - f80: `$ cast call 0xb200…108C "symbol()(string)"` in `#9A9894`. It reveals left to right over 5 frames (a typewriter that writes ~10 characters per frame).
  - f100: `"NVDAc"` in `#F2F0ED`, 600 weight, a hard cut on the 8th.
  - f120: `$ cast call 0xb200…108C "name()(string)"` (5-frame reveal).
  - f140: `"NVIDIA Corporation"` in `#F2F0ED`, 600 weight.
- **Cam:** a 2 px nudge on each output line (f100, f140), recovering in 3 frames.
- **Words on screen:** 0 display words. This shot is terminal only and lets the proof breathe.
- **Colour:** neutral. No gold.

### S3 THE WEIRD PART: "a stock with no code" (B3, f160–f239)

- **f160, hard cut.** Clear the terminal. The tiny `0xef` stays at the top (y 300) as an anchor.
- **Headline:** Anton, 170 px (15.7%), line-height 0.9, `#F2F0ED`, centred at y 820. It builds word by word, each hard-cutting in on an 8th:
  - f160: `A STOCK`
  - f170: `WITH`
  - f180: `NO CODE.`
  - Each word arrives with a 1-frame scale of 1.06 → 1.00 and a typing tick in the audio.
- **f200 (beat 3).** Tag at y 1120, JetBrains Mono 40 px, `#9A9894`: `B20 · built into the chain`. It's a technical tag, so it's exempt like terminal text. It hard-cuts in with a TICK.
- **f200–f239: the byte sinks.** The small `0xef` at the top drops to y 1240 over 12 frames (`ease-in`), then "lands" on a row of five 120 × 40 px outlined blocks (`#3A3A40`, 2 px stroke, which stand for the chain). The block it lands on flashes `#F2F0ED` at 1 frame. That's the precompile idea, shown without a word.
- **Cam:** push 1.00 → 1.03 over f160–f239, linear.
- **Words on screen:** 5 display words. The longer explanation ("it's built into the chain, so it has no bytecode") lives in the post copy.

### S4 THE BREAK: red (B4, f240–f319)

- **f240, hard cut.** Clear the screen.
- **Top label** at y 300, Anton 120 px (11%), `#F2F0ED`: **`SO OUR TESTS BROKE.`** (4 words)
- **Command** at y 520, mono 40 px: `$ forge test`. It types 1 character per frame from f240 to f251, with a tick per character.
- **f260–f299: fail cascade.** One real FAIL line every **5 frames** (16ths), 8 lines in total, from `captures/02-forge-fail.txt` (production captures this).
  - Mono 36 px, `#FF6A3D` (loss vermilion, *not* burgundy). Each line starts with `✕`, e.g. `✕ [FAIL] test_issue_mintsShares()`.
  - Lines stack from y 620 downward. Once 8 are visible they scroll up (cam y −54 px per line).
  - Each line adds a 1-frame RGB split on the whole terminal block (offset ±4 px, accent/paper) and a cam shake of ±3 px.
- **f300 (beat 4): summary.** Inter 700, 64 px, `#FF6A3D`: **`0 passed · {N} failed`**, using the real numbers from the capture.
  - **Honesty gate:** if stock Foundry didn't fail *every* basket test, the label becomes `{F} OF {N} TESTS FAILED.` Never round up.
- **f305–f309: tear.** A horizontal slice glitch: 6 random bands, 20–80 px tall, displaced ±40 px on x, with RGB split ±8 px. The accent channel covers ≤ 6% of the frame (check it).
- **f310–f319: SMASH TO BLACK.** Pure `#0A0A0A` and **digital silence** (§9). Everything goes, including the chyron. This is the only fully black hold in the piece: **10 frames = 0.33 s.**
- **Colour:** vermilion is a signal colour and doesn't count toward the budget (hue ~14°). Burgundy is only the glitch's accent channel, ≤ 6%.

### S5 THE TURN: "Base has its own Foundry" (B5, f320–f399)

- **f320 (downbeat), hard cut from black.** The chyron returns.
  - Anton 130 px (12%), `#F2F0ED`, at y 700, two lines: **`BASE HAS ITS`** / **`OWN FOUNDRY.`** (5 words)
  - No shake. Stillness here is the contrast with S4.
- **f340–f399: slow push.** Cam scale 1.00 → 1.06, `ease-in-out`. It's the only slow zoom in the piece and it should feel like an inhale.
- **f360:** command at y 1000, mono 44 px: `$ base-forge test`. It types 1 character per frame, f360–f376. The cursor is a `#C41A42` block that blinks every 10 frames.
- **f380–f399:** the cursor sits on the finished command. The riser plays in the audio (§9). Visually, a 1 px `#F2F0ED` underline grows from 0 to the full command width (f380–f399, linear). It works like a fuse.

### S6–S7 THE DROP: green (B6–B7, f400–f559)

- **f400, DROP.** The headline cuts out. The terminal moves up to start at y 420.
  - **First PASS line on f400**, mono 36 px, `#3DBE8B` (jade), starting with `✓`, e.g. `✓ [PASS] test_issue_mintsShares() (gas: …)`. The line and its gas number are real, from `captures/03-base-forge-pass.txt`.
- **f400–f475: cascade.** One line every 5 frames, 16 lines, scrolling as in S4.
  - Each line triggers a bell (§9) and a soft **jade bloom**: a 40 px blur copy at 25% opacity that decays over 6 frames.
  - **No shake.** Green is stable; red was unstable.
- **f480 (B7 downbeat): THE PAYOFF FRAME.** The cascade dims to 25% opacity. Centred at y 860:
  - Inter 700, 120 px (11%), `#3DBE8B`, tabular numerals: **`{N} passed`**
  - Below it, Inter 600, 56 px, `#9A9894`: **`0 failed.`**
  - A **gold check ring** (`#C9A96E`, 8 px stroke, 150 px diameter) draws clockwise over 18 frames (`dur-draw` 600 ms) above the number at y 640, with a `#F2F0ED` check inside. This is the **only gold in the video**: ≈1.4% of the frame, under the 3% cap.
- **f520 (beat 3).** Anton 150 px, `#F2F0ED`, at y 1180: **`ALL GREEN.`** Hard cut in, with a 1-frame 1.05 punch.
- **f480–f559:** cam push 1.00 → 1.035, linear. Hold. **Let the green breathe for 2.6 s.** This is the relief.
- **Words on screen:** 4 (`{N} passed`, `0 failed.`, `ALL GREEN.`).

### S8–S9 PAYOFF: the basket holds them (B8–B9, f560–f719)

- **f560: WHIP LEFT.** The whole scene moves −1080 px over 6 frames, `ease-in` then `ease-out`, with a horizontal motion smear (6 ghost copies). The new scene enters from the right on the same move.
  - This is the piece's only whip, used once so it lands.
- **Ticker chips:**
  - Real component list from `getBundle()` on `0x6605…Cd6f`. Expected testnet tokens: tNVDAc, tAAPLc, tMSFTc, tGOOGLc, tAMZNc, tTSLAc. **Verify on chain and show exactly what's returned.**
  - Chips are Inter 600, 44 px, `#F2F0ED` on `#1C1C1F` pills (radius 999, 1 px `#26262A` border). **Plain text, no company logos** (compliance).
  - They start scattered around the frame edges inside the live box. From f570 they pull one per 8th (f570, f580 … f620) into a card at the centre, with a 10-frame `ease-in-out` arc.
  - The **NVDA chip goes first** and keeps a tiny mono `0xef` tag (`#9A9894`, 28 px) so the thread stays visible.
- **The card:** 840 × 620 px, radius 12, centred at (510, 860).
  - Cover is the sapphire jewel duotone: `linear-gradient(160deg, #10223F 0%, #0A0A0A 85%)` with a mid `#3E6FB8` texture at ≤ 35% opacity (TOKENS §10.2).
  - Each chip lands as a row inside the card, and the card pulses scale 1.00 → 1.01 → 1.00 per landing.
- **f640 (B9 downbeat).** The card title sets (top-left inside the card), Anton 84 px, `#F2F0ED`: **`ALLOY DEMO: BIG TECH`**. Below it, Inter 500, 28 px, `#6B6B70`: `aDEMO` (a decorative tag).
- **f660.** A badge under the card, at y 1240: a pill on `#141416` with a 10 px `#C41A42` live dot pulsing every 20 f, Inter 600, 40 px: **`LIVE · TESTNET`**. The network name `base-sepolia` appears in the terminal line below, so "Base Sepolia" is still on screen.
- **f680.** Terminal proof line at y 1340, mono 34 px: `$ cast call 0x6605…Cd6f "name()(string)"` → `"Alloy Demo: Big Tech"` (real, from `captures/04`).
- **Do not show a NAV or $ figure** unless production verifies the decimals and gets director sign-off. Without that it's a number nobody can fact-check from the frame.
- **Terminal line wording:** use the real command with `--rpc-url https://sepolia.base.org` shortened to `…sepolia.base.org`.
- **Words on screen:** card title 4 + badge 2 = 6. `aDEMO` sits in Inter 28 px `#6B6B70` as a decorative tag.
- **Colour:** sapphire carries this shot. Burgundy is only the live dot (<0.1%). No gold (the gold ring left with S7).

### S10 TEASE: the bust made of bytes (B10, f720–f799)

- **f720.** The card dissolves into particles.
  - Canvas 2D. Every particle is a glyph from `0`, `x`, `e`, `f` in JetBrains Mono, 14–22 px, `#F2F0ED` at 30–70% opacity.
  - They spring (stiffness 120, damping 18, fixed timestep 1/30 s) toward target points sampled from a **classical-bust silhouette in profile, facing right**.
  - Production draws that silhouette as one SVG path (head, curl-of-hair edge, neck, truncated shoulders on a plinth line), then rasterises it to a 270 × 480 mask and samples ~1,800 points, with density higher at the edges.
- **The headset.** A horizontal band across the eye line, ~22% of head height, where glyphs render in `#C41A42` at 90% instead of paper, plus a 2 px paper specular line sweeping across it f770–f785 (the "visor glint"). The band covers ≈1.5% of the frame.
- **f760–f799:** hold. Cam drifts 1.00 → 1.02 and rotate 0 → 0.6°. The glyphs jitter ±1 px (seeded noise, 3-frame period) so it feels alive.
- **No text.** No label, no "coming soon". The mystery is the point. Viewers who notice will ask in the replies, and replies are worth the most (75× under the 2023 weights).
- **Fallback:** if the silhouette doesn't read as a *bust* at 50% size in 2 seconds, **cut S10** and extend S11 by 80 frames. No half-legible blob.

### S11 TAGLINE (B11, f800–f879)

- **f796–f799:** 4 frames of near-silence (pre-drop gap, §9). The bust holds.
- **f800 (downbeat).** The bust **explodes** outward: glyphs fly radially, velocity ∝ distance from the centre, faded out by f812. Hard cut in on the same frame:
  - Anton 190 px (17.6%), `#F2F0ED`, at y 700: **`STORIES,`**
  - f820, y 880: **`NOT`**
  - f840, y 1060: **`SYMBOLS.`**
- Each word is a hard cut with a 1.06 → 1.00 punch over 3 frames and a cam shake of ±5 px decaying over 6 frames. **`SYMBOLS.` gets the 1-frame RGB split** as a callback to S1.
- **f860 (beat 4).** Inter 600, 44 px, `#9A9894`, at y 1240: **`Alloy · build log 01`**. A thin `#6D001A` 4 px rule, 300 px wide, sits above it at y 1190. That's the brand burgundy, ≈0.1%.

### S12 OUTRO → LOOP (B12, f880–f959)

- **f880.** The tagline block slides up and scales to 0.55 over 8 frames. Inter 500, 40 px, `#9A9894`, at y 1320: **`Testnet link in replies.`** (4 words)
- **f900, hard cut** to the f0 layout *minus the hero*. The kicker `NVIDIA, tokenized on Base.` is present.
  - f904–f927: the command types 1 character per frame: `$ cast code 0xb200…108C` (24 characters).
  - f928–f959: the cursor blinks (`#C41A42`, every 10 f) where the output will appear.
- **f959 → f0:** the next frame is f0, where `0xef` lands on the downbeat with the boom. **The loop is the hook.** On a replay the viewer has just watched the command get typed, so the cut to `0xef` feels like the answer arriving.
- **Matching checks:**
  - The kicker and command at f959 must be pixel-identical in position to f0.
  - The chyron must be identical.
  - Cam must be scale 1.000 and translate 0 at f959.

## 6. Pacing curve (energy 0–10)

```
bar:  B1  B2  B3  B4    |B5  B6  B7  B8  B9  B10 B11 B12
       9   6   7   8→10 0| 3→6 10   8   7   6   4   9   5→8 (riser into f0 = 10)
                        ^ silence f310–f319
```

- Shot length averages ~1.3 s. Nothing static for more than 0.5 s without at least a 2% push, a typing tick or a new line.
- The two "breaths" are S5 (inhale) and S10 (eerie). Both sit right after a peak, on purpose.

## 7. Money shot and poster

- **Money shot = f0 / poster:** `NVIDIA, tokenized on Base.` / `$ cast code 0xb200…108C` / giant **`0xef`** with the burgundy glow.
  - It's the frame people screenshot and quote-post with "wait what". It's true and checkable by anyone with `cast`, and it carries a curiosity gap without any logo.
- **Secondary screenshot:** f520 (`{N} passed / 0 failed. / ALL GREEN.` with the gold ring).
- **Poster export:** render f0 **and** f60 (which adds `ONE BYTE.`) as PNGs. Director picks. My default is **f60**, because it has the punchline. X uses the first frame unless a custom thumbnail is set (whether custom thumbnails are available on @alloy_fi's tier is **unverified**), so f0 must stand alone. It does.

## 8. Typography rules

1. **Three faces, three jobs.**
   - **Anton** (uppercase, +0.5% tracking, line-height 0.9) is for headlines only, **one Anton block per frame**.
   - **Inter** (`tnum`, `cv11`, `ss01` on) is for kickers, labels and numbers.
   - **JetBrains Mono** is for terminal text and the hero `0xef`.
2. **At most 3 type sizes per frame** (chyron and terminal excluded) (TOKENS §11).
3. **Minimum sizes:** any word the story depends on is ≥ 40 px. Terminal ≥ 34 px. Micro tags ≥ 28 px and must be decorative or redundant.
4. **≤ 7 display words on screen in any frame.** Terminal lines and the `BUILD LOG 01` chyron are exempt. **At most 3 terminal lines are *new* in any 1-second window**, except the cascades, which are meant to be read as texture plus a summary.
5. **Text colour:** `#F2F0ED` or `#9A9894` on `#0A0A0A`. Jade/vermilion only for pass/fail. Gold only for the S7 ring. **Never** set text in `#6D001A` or `#C41A42` (it fails contrast).
6. **Text appears with hard cuts or a ≤ 6-frame move.** No letter-by-letter fade-ins, no bouncy springs with overshoot, no karaoke highlighting.
7. **Grain:** 4% monochrome noise, regenerated per frame (seeded), over everything. **Vignette:** 18% radial at the corners. **No CRT curvature, no scanlines** (cliché).
8. **Fonts are loaded locally** and the render waits on `document.fonts.ready`. A fallback-font frame is an automatic fail.

## 9. Sound design cue sheet

**Engine:** WebAudio `OfflineAudioContext(2, 48000*32, 48000)`, which is preferred, or ffmpeg `lavfi` (`sine`, `anoisesrc`, `aevalsrc`, `afade`, `acrusher`, `lowpass`/`highpass`, `sidechaincompress`, `aecho`). **Everything is synthesised.** No samples, no library loops, no voice.
**Key:** E minor. **Tempo:** 90 BPM. Frame f maps to sample `f × 1600`.

### Instruments

| Name | Recipe |
|---|---|
| **KICK** | Sine; pitch 150 → 45 Hz exponential over 80 ms; amp decay 380 ms. Plus a click: white noise, HP 3 kHz, 3 ms. Peak −3 dBFS. |
| **BOOM** (f0 only) | KICK + sine 60 → 28 Hz over 1.4 s, amp decay 1.6 s + brown noise LP 200 Hz at −18 dB, decay 900 ms. |
| **SUB** | Sine 41.2 Hz (E1), sidechained to KICK (−8 dB duck, 10 ms attack, 160 ms release). |
| **TICK** | Typing: white noise BP 4 kHz (Q 2), 8 ms decay, level randomised −22 to −18 dB, pan randomised ±0.2. |
| **HAT** | White noise HP 8 kHz, 25 ms decay, −20 dB, on 16ths. |
| **FAIL** | Square 55 Hz + 82 Hz, 45 ms, through a bitcrusher (6-bit, ÷4 sample rate), −12 dB. |
| **GLITCH** | 60 ms burst: noise + square 880 Hz, crusher 4-bit ÷8, random 10 ms stutter repeats ×3. |
| **RISER** | White noise with a BP sweep 400 Hz → 9 kHz, plus a sine sweep 220 → 1320 Hz, amp −30 → −8 dB, exponential. **Hard stop, no tail.** |
| **BELL** | FM: carrier sine, modulator ratio 3.5, index 4 → 0 over 300 ms; amp decay 700 ms; 15% send to a 1.2 s `aecho` reverb. |
| **HIT** | KICK + noise snap (BP 1.8 kHz, 70 ms) + low E2 sine pluck (82.4 Hz, 500 ms). Used on tagline words. |

### Cues

| Frames | Bar | Cue |
|---|---|---|
| f0 | B1 | **BOOM** + GLITCH (60 ms) on the hero split. |
| f0–f79 | B1 | No beat yet: just the boom tail and a low E1 drone (SUB, −18 dB) fading in. |
| f40 | B1 | KICK (`ONE BYTE.`) |
| f80, f120 | B2 | KICK. TICK runs during each typewriter reveal (5 ticks). |
| f100, f140 | B2 | HAT pair + soft KICK at −9 dB on the outputs. |
| f160–f239 | B3 | Groove starts: KICK on beats 1 and 3 (f160, f200), HAT on 8ths, SUB at −12 dB. TICK on each headline word (f160, f170, f180). |
| f240–f251 | B4 | TICK × 12 (`forge test` typing). |
| f260–f295 | B4 | **FAIL** on every 16th (f260, f265 … f295) = 8 hits, plus HATs on 16ths. KICK on f260 and f280. |
| f300 | B4 | KICK + FAIL (doubled, −6 dB) on the summary. |
| f305–f309 | B4 | GLITCH × 2 (stutter). |
| **f310–f319** | B4 | **TRUE DIGITAL SILENCE.** 0 samples. No reverb tails: hard-gate everything at f310. |
| f320 | B5 | Single KICK + SUB returns (−14 dB). No hats. |
| f360–f376 | B5 | TICK × 17 (`base-forge test`). |
| f360–f399 | B5 | **RISER** (40 frames = 1.33 s), hard stop at f399. Duck SUB −6 dB under it. |
| **f400** | B6 | **DROP:** KICK + full SUB (−8 dB) + BELL (E5). |
| f405–f475 | B6 | BELL on every 16th. Pitch climbs the E-minor pentatonic (E5 G5 A5 B5 D6 E6 …), looping up an octave once, then capped. KICK on every beat (four on the floor), HAT on 8ths. This cascade is the dopamine. |
| f480 | B7 | KICK + chord BELL (E5 + B5 + E6 together) for `{N} passed`. Gold ring draw: a soft noise "shimmer" (HP 6 kHz, 600 ms swell). |
| f520 | B7 | HIT (`ALL GREEN.`). |
| f480–f559 | B7 | Groove holds; bells stop. Half-time feel: KICK on beats 1 and 3, SUB sustained. |
| f560–f565 | B8 | WHOOSH: noise BP sweep 2 kHz → 300 Hz over 6 frames, panned L ← R. The only whoosh. |
| f570–f620 | B8 | Soft TICK (−16 dB) + a 30 ms sine "lock" at 660 Hz as each chip lands (6 hits on 8ths). |
| f640, f660, f680 | B9 | KICK on the downbeat. Muted BELL (−18 dB) on the badge. TICK on the terminal line. |
| f720–f795 | B10 | Groove drops out. SUB only, plus a filtered noise bed (LP 900 Hz, −24 dB) and a slow BELL glissando down an octave on the visor glint at f770. Eerie. |
| **f796–f799** | B10 | Pre-drop gap: everything except a −30 dB room tone. |
| f800, f820, f840 | B11 | **HIT** on each tagline word. `SYMBOLS.` also gets a GLITCH. |
| f860 | B11 | KICK + BELL (E5, −12 dB) on `Alloy · build log 01`. |
| f880–f899 | B12 | KICK on beats; groove at −3 dB. |
| f904–f927 | B12 | TICK × 24 (`cast code …` typing). |
| f920–f959 | B12 | **RISER** (40 frames), hard stop at f959, so the loop's f0 BOOM lands as the release. |

**Mix notes:**
- Keep the sub content mono below 120 Hz.
- The bells sit 3 dB under the kick.
- Listen on phone speakers. If the cue sheet only works on headphones, it fails. The kick and the 55 Hz FAIL must still be audible as 110/165 Hz harmonics on a phone, so add a 2nd-harmonic saturation layer.

## 10. Colour budget per shot

Budgets are checked by the TOKENS §8 pixel script on every 5th frame. Gold is hue 30–48°, saturation 0.3–0.7, value ≥ 0.45.

| Shot | Burgundy family (≤ 10%) | Gold (≤ 3%) | Content colour |
|---|---|---|---|
| S1 | `$`, chyron square, 2-frame RGB split ≤ 4% | 0 | none |
| S2 | `$` only, < 0.5% | 0 | none |
| S3 | < 0.5% | 0 | none |
| S4 | glitch accent channel ≤ 6% (f305–f309) | 0 | vermilion fail lines |
| S5 | cursor < 0.3% | 0 | none |
| S6–S7 | glow (doesn't count), < 1% | **gold ring ≈ 1.4% (only gold in the video)** | jade |
| S8–S9 | live dot < 0.1% | 0 | sapphire card |
| S10 | visor band ≈ 1.5% | 0 | glyphs paper |
| S11 | 4 px rule + `SYMBOLS.` split ≤ 3% | 0 | none |
| S12 | cursor < 0.3% | 0 | none |

**Never:** burgundy fills or backgrounds, a red/blue Base-like square, or blue glow ("cyber").

## 11. Compliance in-frame

- "Testnet" is visible whenever Base Sepolia is shown (S9).
- No Base or Coinbase logos, and no company logos. Tickers are plain text.
- No returns, no prices, no "invest now".
- "Base's own Foundry" is a factual description of base-forge; there is no claim of partnership.
- The post caption and first reply carry: "Tokenized stock exposure, not shares. Not available to US persons. Built on Base, not by Base." Plus the basescan link and repo/commands thread.

## 12. Banger checklist (pass/fail, judged on every render)

1. **Hook ≤ 1 s:** f0 alone tells you something strange ("NVIDIA" + "0xef") with no logo, and `0xef` is on screen at f0.
2. **≤ 7 display words** on any frame (terminal and chyron exempt). Checked by sampling every 5th frame.
3. **Every cut lands on the grid:** major cuts on multiples of 20 frames, minor ones on multiples of 5. Checked against the shot list ±0 frames.
4. **Sound-off test passes:** with audio muted, a cold viewer can retell the story (no code → tests broke → fixed → basket live).
5. **Legibility at 50%:** watched at 540 × 960 on a phone, every story word is readable within its on-screen time. No story text under 40 px.
6. **Safe areas:** zero text pixels in the bottom 280, right 120 or top 140 (an automated overlay check on every 5th frame).
7. **No dead air > 0.5 s:** every 15-frame window has a visual change *or* a new sound. The only exception is the deliberate 10-frame black and silence at f310–f319.
8. **Colour budgets:** burgundy ≤ 10% and gold ≤ 3% on every frame. Exactly one gold element, in S7 only.
9. **Contrast:** all text ≥ 4.5:1 on its background, or ≥ 3:1 for ≥ 60 px Anton. No text in `#6D001A` or `#C41A42`.
10. **Truth audit:** every terminal string and number traces line by line to a file in `captures/`, and `{N}`/`{F}` match the capture exactly. Any mismatch is an instant fail.
11. **The turn lands:** red cascade → 10 frames of black and true silence → green drop on f400. On first watch it should make you lean in. If the silence reads as a render glitch, it fails.
12. **Seamless loop:** played back to back, the f959 → f0 seam is invisible in the picture and lands as a downbeat in the audio. No click, no pop (check the waveform at the seam), and the riser hard-stops exactly at f959.
13. **Length 30–34 s.** File ≤ 512 MB (easily). 1080 × 1920, 30.000 fps CFR, audio at −14 LUFS ±1, true peak ≤ −1 dBTP.
14. **Phone-speaker test:** the kick, fail buzz and bells are audible on a phone speaker at 50% volume, and the master doesn't clip.
15. **Deterministic:** two renders are byte-identical in their frame PNGs. All randomness is seeded and no timer reads the wall clock.

## 13. Three things that would make it cringe / AI-ish (instant reject)

1. **Fake-terminal theatre.** Glossy macOS window chrome with traffic lights, 3D-tilted windows, invented hashes, made-up test names, or retyped "cleaned" output. Builders will check `cast code` themselves; one fake byte kills the whole series.
2. **Hype copy and generic crypto visuals.** "Revolutionizing", "the future of finance", "this changes everything", 🚀, blue cyber glows, candlestick stock footage, lens flares, a countdown to nothing. Our voice is dry: `ONE BYTE.`
3. **Template motion and sound.** Every element spring-bouncing in with overshoot, Ken Burns on everything, word-by-word karaoke captions, swooshes on every cut, a generic EDM/phonk drop, or an AI voiceover. One whip, one silence, one glitch motif (failure only), one bell motif (success only). Restraint is the premium signal.

## 14. Deliverables from production (in this folder)

- `captures/02-forge-fail.txt`: real stock `forge test` output.
- `captures/03-base-forge-pass.txt`: real `base-forge test` output.
- `captures/05-getbundle.txt`: `getBundle()` on the demo basket.
- Renders:
  - `out/build-log-01.mp4`
  - `out/poster-f0.png`, `out/poster-f60.png`
  - `out/contact-sheet.png`: every 20th frame with a grid overlay and the safe-area mask.
  - `out/budget.csv`: burgundy %, gold % and text-in-unsafe-area per sampled frame.
- A note listing any copy that changed because of the honesty gates (S4 `{F} OF {N}`, S8 tickers).
