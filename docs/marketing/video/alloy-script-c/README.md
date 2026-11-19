# ALLOY SCRIPT C: "Priya, $5 and one idea" (short cut, 50.0 s)

This is a full animated build of Concept C, the short cut, from `docs/marketing/script/SCRIPTS.md`.
- It follows the "Recommended script, on-screen text only (C short cut, 50.0 s)" list.
- The visuals follow the Concept C table's "What the viewer sees" column.
- Timings match the text-only test `../script-test-c/script-test-c.mp4` frame for frame. No hold is shortened.

## Timeline (exact holds, 30 fps, 1500 frames)

| # | Frames | Time | On screen (exact) | Visual |
|---|---|---|---|---|
| C1 | 0–104 | 0:00.0–0:03.5 | Priya wants to / invest in AI. | Flat evening scene: lamp, window, sofa, a simple figure with a glowing phone, and a name tag "Priya, Pune". |
| C2 | 105–224 | 0:03.5–0:07.5 | But which stocks? / She has no idea. | Her phone: an "AI stocks" search, with tickers adding one by one in a calm list. |
| (fold) | 225–254 | 0:07.5–0:08.5 | *(no text)* | The list folds into one card: The AI Build-Out. |
| C3 | 255–374 | 0:08.5–0:12.5 | On Alloy, she buys / the whole idea. | The v4 Holding certificate on the phone, with the ALLOY wordmark at the top of the app. |
| C4 | 375–494 | 0:12.5–0:16.5 | A basket: / 5 US stocks, / one idea. | The card opens into 5 bars: NVDA 35, MSFT 25, GOOGL 20, AMZN 12, META 8. |
| C6 | 495–704 | 0:16.5–0:23.5 | She checks: / did followers / make money too? + Example basket. / Past results aren't a promise. | Two labelled lines, "Followers" and "Creator", draw slowly. There are no numbers. |
| C7 | 705–794 | 0:23.5–0:26.5 | She starts with $5. | She taps $5, holds the buy button, and a check appears (gold ring, the only gold). |
| C8 | 795–914 | 0:26.5–0:30.5 | Weeks later, / one stock grows / too big. | The calendar flips from WEEK 1 to WEEK 6. The NVDA bar grows past the dashed line while the others dim. |
| C9 | 915–1034 | 0:30.5–0:34.5 | Alloy trims it back. / She does nothing. | The bar eases back and the note "Reason: NVDA ran ahead." appears. Then Priya is cooking, phone face down. |
| C11 | 1035–1124 | 0:34.5–0:37.5 | She can sell anytime. | The sell slider goes to All, then back to the home screen. |
| C12 | 1125–1229 | 0:37.5–0:41.0 | ALLOY / Invest in stories, / not symbols. | Wordmark on black with the five-tone Alloy bar. |
| C13 | 1230–1499 | 0:41.0–0:50.0 | Follow @alloy_fi / for early access. + Tokenized stock exposure, not shares. / Not available to US persons. / You can lose money. | Static end card. |

## User-test rules: how they're met

- **Readable for the whole hold:**
  - Each line fades in over 8 frames (0.27 s) and then doesn't move.
  - Nothing animates over the text: all motion stays in the phone or illustration zone below it, from y 720 down.
  - The camera never moves the text.
- **One idea per scene.** Every scene has one line and one visual action.
- **Type sizes:**
  - Headlines are Inter 600 at **88 px** in 9:16 and 72 px in 1:1.
  - The micro and compliance lines are **64 px**.
  - The name tag is 64 px.
  - No card exceeds 8 words; C6 is 7 + 7, as scripted.
- **Calm pacing.** Visual motion supports the line (a list grows, bars fill, lines draw slowly) and is never faster than the reading.
- **Priya isn't a photo or a mascot.** She appears as a flat abstract figure, over-the-shoulder phone views, and a name tag.
- **UI:** the v4 language throughout: certificate frame, guilloche engraving, signature rule, Alloy bars and a square button.
  - Jewel tones on near-black.
  - Burgundy and gold are checked per frame in `out/budget.csv`.
- **No dev content.** The only tickers are from our universe: NVDA, MSFT, AAPL, GOOGL, AMZN, META, TSLA, MSTR, SNDK, SPCX.
- **Compliance:**
  - The chart carries "Example basket. Past results aren't a promise." and shows no numbers.
  - The end card has all three lines.
  - No Base or Coinbase mention.
  - Creator stake and fee aren't shown, because C5 is cut in the short version.

## Files (`out/`)

| File | What |
|---|---|
| `alloy-script-c.mp4` | **9:16 silent master**, 50.0 s, ≤ 50 MB. |
| `alloy-script-c-pixabay-*.mp4` | One version per Pixabay track (below). |
| `alloy-script-c-1x1*.mp4` | 1:1 versions of the above. |
| `alloy-script-c-master.mp4`, `alloy-script-c-1x1-master.mp4` | CRF 18 video-only masters. |
| `poster-c1.png`, `poster-c3.png`, `poster-end.png` | Lossless stills. |
| `contact-sheet.png`, `contact-sheet-50pct.png` | One frame per second with the safe-area mask, and one frame every 2 s at 50% scale. |
| `budget.csv` | Burgundy %, gold %, text in unsafe areas, and words, for every 5th frame. |

## Music (Pixabay Content License: free for commercial use, no attribution required)

- **Tracks:** each `audio/*.mp3` gets its own version:
  - `pixabay-refined-motion`
  - `pixabay-elegant-minimal`
  - `pixabay-minimal-electronica`
  - `pixabay-chill-abstract-intention`
- **Bed:**
  - The music starts at the track's first audible sound, with a 1.5 s fade-in and a 3 s fade-out.
  - It's mastered quietly to **−18 LUFS** (≤ −2 dBTP).
  - No SFX are added.
- **Licence proof:** keep a screenshot of each track's Pixabay page and licence with the download date.

## Re-render

Run `NODE_MODULES=/path/with/playwright-core/node_modules SQ=1 ./scenes/build.sh`.
- `scenes/index.html` reuses the v4 certificate and Alloy-bar helpers from `../alloy-idea-01/scenes/` (same `assets/guil.js` engravings, generated from real basket data).
- `?sq=1` renders the 1:1 cut.
- `SKIP_VIDEO=1` re-uses the masters (for a music swap).
