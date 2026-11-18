# ALLOY IDEA 01: "Which stocks?" (production notes)

The creative brief is `DIRECTION.md`, owned by the Director. This file covers the build.

- **Format:** 26.0 s, 780 frames, 1080×1920 at 30 fps.
- **Grid:** cut on a 120 BPM grid (1 beat = 15 frames, 1 bar = 60). Major events land on f0, 60, 120 … 720.
- **Hook:** H1.

## Files

| File | What |
|---|---|
| `out/alloy-idea-01.mp4` | **Delivery, 9:16, ≤ 50 MB, no music.** The audio track is silent. If licensed SFX are added to `sfx/` (below), they're mixed in. |
| `out/alloy-idea-01-music.mp4` | Built automatically once a track is dropped into `audio/` (below). |
| `out/alloy-idea-01-master.mp4` | CRF 18 video-only master. It's large because the 4% grain changes on every frame. |
| `out/poster-f0.png`, `poster-f90.png`, `poster-f720.png` | Thumbnail (hook), money shot, end card. Lossless, straight from the page. |
| `out/contact-sheet.png` | Every 15th frame. Unsafe areas are tinted red and the 1:1 square band (y 420–1500) is outlined in cyan. |
| `out/budget.csv` | For every 5th frame: burgundy %, gold %, bright text pixels in unsafe areas, and the headline + caption word count. |
| `scenes/` | `index.html` (all shots; `renderAt(t)` is a pure function of the frame), `render.mjs`, `build.sh`, `budget.mjs`, `fonts/` (OFL), `assets/` (basket covers from `apps/web/public/brand/covers/`). |

## Re-render

Run `NODE_MODULES=/path/with/playwright-core/node_modules ./scenes/build.sh`.
- It needs Google Chrome in `/Applications` and `/opt/homebrew/bin/ffmpeg`.
- It takes about 8 min, mostly the grain.
- `SKIP_VIDEO=1` re-uses the master and only redoes the audio, encodes and QA.

## Adding the music (slot)

**Track.** Put the licensed track in `audio/` (or `music/`, the Director's name for it) together with a `track.json`:

```json
{ "file": "track.mp3", "drop": 31.25, "bpm": 122 }
```

- `drop` is the time **in the original file** where the main drop hits. The build sets the in-point so the drop lands on **f60**, the frame where the ticker wall collapses into the card. That works out to in-point = drop − 2.000 s, scaled by the tempo factor.
- `bpm` within ±3% of 120 is conformed with `atempo`, which keeps pitch. Outside that range the build doesn't stretch the track and prints a warning. Per DIRECTION §9, re-time the grid instead.
- The build gates the track to −30 dB for the S11 break (f645–f659), fades it out over the last 1.2 s, and masters it to −14 LUFS / −1.5 dBTP with a two-pass linear loudnorm. The output is `out/alloy-idea-01-music.mp4`.
- Keep the licence proof (screenshot or PDF, URL, date) in `audio/` or `licence/`.

**SFX** (optional, licensed only; DIRECTION §10 lists the cue sheet). Put the files in `sfx/` plus a `cues.json`:

```json
[{"file": "tap.wav", "frame": 195, "db": -12}, {"file": "chime.wav", "frame": 240, "db": -14}]
```

They're mixed into both outputs. List each file's source and licence in `sfx/SOURCES.md`.

**No synthesized music, and no synthesized SFX.** That's why the no-music version is silent for now.

## UI look (interim)

The cards-v3 look is being replaced, so it isn't used. Every UI shot is an editorial composition:
- a basket cover image (4 px corners, 1 px `#26262A` hairline, 60% bottom scrim),
- the name and one line in Inter,
- one big Anton number,
- a slim **recipe strip** of jewel-tone bands, one per stock, width = weight, shaded from the basket tone's mid stop to its deep stop,
- square-edged off-white buttons, and sheets and panels with 4 px corners and hairline borders.

When cards-v4 exists, swap `compHTML()`, `cover()` and the panel markup in `scenes/index.html`.

## Copy and data notes (for the Director and founder)

**Data sources:**
- The recipe (NVDA 35 / MSFT 25 / GOOGL 20 / AMZN 12 / META 8) and the chart's creator line come from `docs/design/cards-data/baskets.json`, which is a real buy-and-hold index.
- **The follower line is illustrative.** It's the same index with a gap that grows linearly to −0.6% (the COPY figure). There are no axis values or return labels, and `Example basket. Past performance isn't a promise.` is on screen.
- The S6 drift shows the other weights shrinking proportionally (NVDA 41% → MSFT 23%, GOOGL 18%, AMZN 11%, META 7%), as the Director specified.

**Strings trimmed or changed for the video:**
- The S2 composition footer reads "5 stocks · Balanced", per the Director, instead of the wrong "Rebalanced monthly".
- The S4 button reads "Choose an amount" (a disabled state) until the $5 tap.
- The S5 basket-token chip uses `AIB` as a placeholder symbol.
- The S11 sell readout counts 0% → All, because we show no $ amount on exit.
- The trim panel header reads "Back inside the band · The AI Build-Out".

**Layout adjustments:**
- The S10 caption moved to y 1320 (the brief had y 1180) to clear the cover-tone picker.
- The S12 tagline is Anton 160 at x 76 (the brief had 170 at x 90), so `NOT SYMBOLS.` stays inside x ≤ 960.

**Flag for the founder:** the creator fee is 1%/yr split 80/20, so creators net 0.8%. The video only says "Creators earn a fee." COPY.md's landing line "earn 1%" should be fixed.

**Not in the video:**
- Capitol Tech (on purpose, per DIRECTION §5 S3).
- Any terminal, code, test, testnet or mascot content.
- Base or Coinbase names or logos.

## Not yet delivered

- The 1:1 cut and the 20 s cutdown (DIRECTION §11). The layout keeps story-critical elements inside y 420–1500, so the 1:1 cut is a reframe.
- The music and SFX versions. They're waiting on licensed files from the founder.

## Post copy (draft)

> Everyone says buy AI. Which stocks? Alloy turns the idea into one basket: pick a story, start with $5, and it stays on recipe by itself. Coming soon.

First reply:

> Tokenized stock exposure, not shares. Not for US persons. Built on Base, not by Base. Waitlist: https://crates-ui.vercel.app
