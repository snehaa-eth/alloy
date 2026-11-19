# REVIEW 02: alloy-idea-01, round 2

**Reviewer:** Director. **Date:** 2026-11-19.

**Files reviewed:**
- `out/alloy-idea-01.mp4` (9:16, 780 frames)
- `out/alloy-idea-01-1x1.mp4` (1:1, 780 frames)
- `contact-sheet.png`, `contact-sheet-50pct.png`, `contact-sheet-1x1-50pct.png`
- `budget.csv`

**Method:**
- 16 key frames at 50% size.
- Frame-by-frame strips at f58–f73, f620–f651 and f716–f731.
- A full-res crop of the S9 chart.
- Compared against `cards-data/shots/*-v4.png`.

## Verdict: **CHANGES REQUIRED (polish only). Conditionally approved.**

This is a different film from round 1, and it's now genuinely good.
- The v4 Certificate and Alloy-bar language is used faithfully: serial head, stamp, guilloche engraving, burgundy signature rule, mono keys, Anton figure, two-field ledger, square primary, foot link.
- There are no Penny elements, no dev content and no testnet.
- The drift is now readable at 50% (`35% → 41%` as the figure, plus `BAND 40`).
- The followers chart is a labelled illustration with no crash.
- The four-tone carousel is the colour moment I wanted.
- The tagline-to-end-card Alloy bar is a real brand device.
- Budgets: burgundy max 0.39%, gold max 0.88% (one element), no unsafe text, max 6 words.

Six polish defects remain. **Fix exactly these and the film is APPROVED.** I'll spot-check only the frames named below, not do a full round 3.

## Notes

**1. f60–f72, the turn (9:16 and 1:1).** It's much better, but there are three blemishes:
- **(a) Duplicates.** f60–f64 shows each basket ticker twice (the static wall copy plus the flying copy: NVDA, MSFT, AMZN and META appear twice in the f62–f64 frames). Hide the wall copies of those five at f60, so only the flying originals exist.
- **(b) Wall residue.** Wall tickers are still visible *inside* the landing certificate at f66–f69 (AVGO, TSM, ORCL, ARM, SMCI, CRWV over the engraving and ledger). The wall must be at 0 opacity by f66, before the certificate's first frame.
- **(c) Landing clutter.** The five tickers arrive as an overlapping clump at f66–f71 (NVDA/MSFT stacked). Stagger their arrival by 1 frame each, left to right, so each one lands cleanly on its legend slot, the last at f71.

**2. f630–f633, the exit flip.** The certificate rotates edge-on and leaves a 1–2 frame vertical sliver on black (f630 in both cuts). It reads as a render glitch. Replace the 3D flip with a **4-frame crossfade plus a 12 px rise** from the Redemption face to the in-kind face, f628–f632. Keep everything after f633 as is.

**3. f720–f721, end-card collision (9:16).** The Alloy bar, travelling from the tagline to its slot under `ALLOY`, crosses over `COMING SOON` on f720. Either:
- **hard-cut** the bar straight into its small slot under `ALLOY` on f720 (preferred: it's a downbeat), or
- animate it on a path that never intersects text.

The 1:1 version doesn't collide. Check it again after the change.

**4. f540–f599, background tickers in S10.**
- In 9:16, `AMD` and `MU` overlap each other at x ≈ 90, y ≈ 1450–1500, and crowd `Creators earn a fee.`.
- In 1:1 (f570), `AMD ORCL ASML` are cropped by the bottom edge.

Fix: re-seed with ≥ 24 px clearance, keep them ≥ 60 px from the caption, and keep them fully inside the frame in 1:1 (or drop them from the 1:1 cut).

**5. f480–f539, the S9 chart.**
- **(a)** The creator (dashed) and follower (solid) lines run within about 6 px of each other at 50% size. Widen the end gap to **≥ 14 px** at 1080 width, as REVIEW-01 asked, growing from 0 at the left edge.
- **(b)** The figure `-0.6%` uses an ASCII hyphen. Use a true minus `−` (U+2212), as the other v4 figures do.

**6. f120–f179, carousel content: accepted, with a note.** Production used **Conviction Bets** (MSTR 40 / TSLA 40 / NVDA 20) in the plum slot instead of Space Race, because Space Race has no recipe in `cards-data`. That's the right call: no invented recipes. **Accepted, no change.**

(Founder FYI: it's a concentrated 3-stock basket with a crypto-proxy stock. If you'd rather lead with themes, add a real Space Race recipe to `baskets.json` and production can swap it in. Not blocking.)

## Checklist (DIRECTION §13)

| # | Item | Round 2 |
|---|---|---|
| 1 | Hook ≤ 1 s | PASS |
| 2 | Idea lands sound-off | PASS |
| 3 | f60 turn lands | PASS once note 1 is fixed |
| 4 | ≤ 7 words | PASS (max 6) |
| 5 | One headline / one idea per shot | PASS |
| 6 | Cuts on beat | PASS |
| 7 | 50% legibility | PASS (v4 keys are ≥ 30 px. The legal micro is small but acceptable for legal.) |
| 8 | Real-app (v4) UI | PASS |
| 9 | Hard bans absent | PASS |
| 10 | Compliance | PASS: "Tokenized stock exposure, not shares." (S4/S5 and end card), "Not for US persons." (end card), "Illustration. Past performance isn't a promise." (S8–S9). No return-as-gain. |
| 11 | Colour budgets | PASS |
| 12 | Safe areas | PASS |
| 13 | No dead air | PASS (the S11 break hold is intended) |
| 14 | Audio | PENDING founder track. Not blocking. The music slot in the build is ready. |
| 15 | Deliverables | PASS: 9:16, 1:1, 50% contact sheets, posters |

## After the fixes

- Re-render both cuts.
- Send me stills of **f60–f72 (every frame)**, **f628–f634**, **f718–f722**, **f570** (9:16 and 1:1) and **f525**.
- If those frames are clean, the film is **APPROVED for picture lock**. Audio is mixed once the founder picks a track (DIRECTION §9–10), and the audio pass is reviewed on its own.
