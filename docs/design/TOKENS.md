# Alloy: design tokens (v0.2)

**v0.2 (2026-11-19) applies the founder's palette decisions:**
- dark mode is the default,
- primary buttons on dark are off-white,
- background is #0A0A0A and text is #F2F0ED,
- gain is jade,
- the pink accent is removed.

The tokens come from the founder's "Project CAESAR" moodboard: Black, **Burgundy #6D001A**, White. Its mood is heavy condensed uppercase headlines, an editorial high-contrast feel, classical statue × future, burgundy silk and white smoke.

Contrast ratios are WCAG 2.x relative-luminance ratios, computed by a script (`tbl.py` logic, sRGB formula). AA needs:
- **4.5:1** for body text,
- **3:1** for large text (≥24px, or ≥18.66px bold),
- **3:1** for UI component boundaries and states (WCAG 1.4.11).

---

## 1. Principles

1. **Burgundy is used sparingly: under 10% of any screen.** *(Founder-approved, top rule.)* It marks the brand and a few states. Everything else is warm black and off-white.
   - The 10% check counts saturated burgundy pixels (#6D001A, the accent #C41A42 and their shades). Pale tints don't count.
   - It is verified per frame by a pixel script (see §8).
2. **Dark mode is the default.** Light ("smoke") is an option in settings.
3. **On dark, the primary button is off-white (#F2F0ED) with black text.**
   - Burgundy #6D001A on #0A0A0A is only **1.57:1**, which fails the 3:1 component rule.
   - Burgundy-filled buttons appear only on light surfaces, or on big brand moments (hero, share card) where the button has a visible off-white boundary.
4. **Two burgundies, two jobs.**
   - **Brand #6D001A** covers *large surfaces*: hero blocks, the notice-banner border and fill tint, share cards. Text on it is off-white (11.09:1).
   - **Accent #C41A42** is for *small UI accents on dark*: selected tab mark, active state, focus ring, progress bars, rebalance ticks. Never body text.
   - The founder proposed **#B5123A**, which is 3.11:1 on pure black but **2.93:1 on our new #0A0A0A bg**, so it fails 3:1. #C41A42 is the nearest hue that passes on bg (3.37) and surface-1 (3.13).
   - Don't put the accent on surface-2 (#1C1C1F, 2.89). Selected chips there use an off-white fill instead.
5. **Burgundy is the brand, never a signal.**
   - Gain is **jade** and loss is **vermilion**, both hue-separated from burgundy.
   - Every gain/loss number carries a sign and an arrow (▲ +4.2% / ▼ −1.8%), so colour is never the only cue.
6. **No pink accent.**
   - Links on dark are off-white and underlined.
   - Links on light are burgundy #6D001A and underlined.

---

## 2. Core palette

### Neutrals (warm ink)
| Token | Hex | Use |
|---|---|---|
| `ink-bg` | `#0A0A0A` | **Dark bg (default)** |
| `ink-950` | `#0F0F10` | Dark sheets / modals |
| `ink-900` | `#141416` | Dark surface-1 (cards) |
| `ink-850` | `#1C1C1F` | Dark surface-2 (inputs, chips) |
| `ink-800` | `#26262A` | Dark hairline border (decorative) |
| `ink-700` | `#3A3A40` | Dark divider (decorative) |
| `ink-600` | `#6B6B70` | **Dark input border** (3.74:1) |
| `ink-500` | `#5C5C62` | Light-mode secondary text / input border |
| `ink-400` | `#9A9894` | **Dark secondary text** (warm grey, 6.88:1) |
| `ink-300` | `#C9C7C3` | Dark tertiary-but-readable text (11.73:1) |
| `ink-200` | `#DADAD7` | Light hairline border |
| `ink-100` | `#ECEBE8` | Light surface-2 |
| `ink-50` | `#F6F5F3` | Light bg ("smoke") |
| `paper` | `#F2F0ED` | **Dark-mode text + dark-mode primary button fill** |
| `white` | `#FFFFFF` | Light surface-1 (cards) |

### Burgundy
| Token | Hex | Use |
|---|---|---|
| `burgundy-950` | `#2A000A` | Dark notice-banner fill |
| `burgundy-900` | `#4A0012` | Pressed (light-mode primary) |
| **`burgundy-800` (brand)** | **`#6D001A`** | Big brand surfaces; light-mode primary button; light-mode links |
| `burgundy-700` | `#8C1230` | Hover on light-mode primary |
| **`accent`** | **`#C41A42`** | Small accents on dark: selected mark, focus ring, progress, rebalance ticks |
| `burgundy-100` | `#F6E6EA` | Light notice-banner fill (tint; not counted in the 10%) |
| `burgundy-50` | `#FBF3F5` | Light selected row (tint) |

### Signal
| Token | Dark | Light | Meaning |
|---|---|---|---|
| `gain` | `#3DBE8B` (jade) | `#0E7A52` | Up, profit |
| `loss` | `#FF6A3D` (vermilion) | `#C2410C` | Down, loss, destructive |
| `warn` | `#F2B33D` | `#8A5A00` | Market closed, stale price |

---

## 3. Semantic tokens

| Semantic | Dark (default) | Light |
|---|---|---|
| `bg` | `#0A0A0A` | `#F6F5F3` |
| `surface-1` | `#141416` | `#FFFFFF` |
| `surface-2` | `#1C1C1F` | `#ECEBE8` |
| `sheet` | `#0F0F10` | `#FFFFFF` |
| `text` | `#F2F0ED` | `#0A0A0A` |
| `text-2` | `#9A9894` | `#5C5C62` |
| `text-3` | `#C9C7C3` | `#5C5C62` |
| `border` (decorative) | `#26262A` | `#DADAD7` |
| `border-input` (≥3:1) | `#6B6B70` | `#5C5C62` |
| `primary` / `on-primary` | `#F2F0ED` / `#0A0A0A` | `#6D001A` / `#FFFFFF` |
| `primary-hover` | `#FFFFFF` | `#8C1230` |
| `primary-pressed` | `#C9C7C3` | `#4A0012` |
| `secondary` (outline button) | 1.5px `#F2F0ED` border, text `#F2F0ED` | 1.5px `#0A0A0A` border |
| `link` | `#F2F0ED` + underline | `#6D001A` + underline |
| `accent` (selected, progress, ticks) | `#C41A42` | `#6D001A` |
| `focus-ring` | 2px `#C41A42` + 2px offset | 2px `#6D001A` |
| `brand-surface` / `on-brand` | `#6D001A` / `#F2F0ED` | `#6D001A` / `#FFFFFF` |
| `notice-bg` / `notice-border` | `#2A000A` / `#6D001A` (with a 3px `#C41A42` left rule) | `#F6E6EA` / `#6D001A` |

---

## 4. Contrast ratios (script output)

| Pair | Fg | Bg | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Text on bg (dark) | `#F2F0ED` | `#0A0A0A` | 17.41 | 4.5 | **pass** |
| Text on surface-1 (dark) | `#F2F0ED` | `#141416` | 16.18 | 4.5 | **pass** |
| Text on surface-2 (dark) | `#F2F0ED` | `#1C1C1F` | 14.95 | 4.5 | **pass** |
| Text-2 on bg (dark) | `#9A9894` | `#0A0A0A` | 6.88 | 4.5 | **pass** |
| Text-2 on surface-1 (dark) | `#9A9894` | `#141416` | 6.39 | 4.5 | **pass** |
| Text-3 on bg (dark) | `#C9C7C3` | `#0A0A0A` | 11.73 | 4.5 | **pass** |
| Primary button: ink on off-white (dark) | `#0A0A0A` | `#F2F0ED` | 17.41 | 4.5 | **pass** |
| Primary button boundary: off-white vs bg (dark) | `#F2F0ED` | `#0A0A0A` | 17.41 | 3 | **pass** |
| Accent (selected/focus/progress) on bg (dark) | `#C41A42` | `#0A0A0A` | 3.37 | 3 | **pass** |
| Accent on surface-1 (dark) | `#C41A42` | `#141416` | 3.13 | 3 | **pass** |
| Accent on surface-2 (dark), avoid | `#C41A42` | `#1C1C1F` | 2.89 | 3 | **FAIL** |
| Founder's #B5123A on bg #0A0A0A | `#B5123A` | `#0A0A0A` | 2.93 | 3 | **FAIL** |
| Founder's #B5123A on pure black | `#B5123A` | `#000000` | 3.11 | 3 | **pass** |
| Brand #6D001A on bg (dark), never as UI/text | `#6D001A` | `#0A0A0A` | 1.57 | 3 | **FAIL** |
| Off-white on brand surface (hero/banner/share) | `#F2F0ED` | `#6D001A` | 11.09 | 4.5 | **pass** |
| Off-white on accent fill | `#F2F0ED` | `#C41A42` | 5.17 | 4.5 | **pass** |
| Text on notice surface (dark) | `#F2F0ED` | `#2A000A` | 16.74 | 4.5 | **pass** |
| Input border on bg (dark) | `#6B6B70` | `#0A0A0A` | 3.74 | 3 | **pass** |
| Input border on surface-1 (dark) | `#6B6B70` | `#141416` | 3.47 | 3 | **pass** |
| Hairline border (decorative) | `#26262A` | `#0A0A0A` | 1.31 | - | decorative only |
| Gain jade on bg (dark) | `#3DBE8B` | `#0A0A0A` | 8.43 | 4.5 | **pass** |
| Gain jade on surface-1 (dark) | `#3DBE8B` | `#141416` | 7.83 | 4.5 | **pass** |
| Loss vermilion on bg (dark) | `#FF6A3D` | `#0A0A0A` | 6.96 | 4.5 | **pass** |
| Loss vermilion on surface-1 (dark) | `#FF6A3D` | `#141416` | 6.47 | 4.5 | **pass** |
| Warn on bg (dark) | `#F2B33D` | `#0A0A0A` | 10.64 | 4.5 | **pass** |
| Warn on surface-1 (dark) | `#F2B33D` | `#141416` | 9.89 | 4.5 | **pass** |
| Text on bg (light) | `#0A0A0A` | `#F6F5F3` | 18.17 | 4.5 | **pass** |
| Text on surface-1 (light) | `#0A0A0A` | `#FFFFFF` | 19.80 | 4.5 | **pass** |
| Text-2 on surface-1 (light) | `#5C5C62` | `#FFFFFF` | 6.64 | 4.5 | **pass** |
| Text-2 on bg (light) | `#5C5C62` | `#F6F5F3` | 6.09 | 4.5 | **pass** |
| Primary button: white on burgundy (light) | `#FFFFFF` | `#6D001A` | 12.61 | 4.5 | **pass** |
| Burgundy link/text on surface-1 (light) | `#6D001A` | `#FFFFFF` | 12.61 | 4.5 | **pass** |
| Burgundy on bg (light) | `#6D001A` | `#F6F5F3` | 11.57 | 4.5 | **pass** |
| Burgundy on notice tint (light) | `#6D001A` | `#F6E6EA` | 10.46 | 4.5 | **pass** |
| Gain jade (light) on surface-1 | `#0E7A52` | `#FFFFFF` | 5.35 | 4.5 | **pass** |
| Gain jade (light) on bg | `#0E7A52` | `#F6F5F3` | 4.91 | 4.5 | **pass** |
| Loss (light) on surface-1 | `#C2410C` | `#FFFFFF` | 5.18 | 4.5 | **pass** |
| Loss (light) on bg | `#C2410C` | `#F6F5F3` | 4.75 | 4.5 | **pass** |
| Warn (light) on surface-1 | `#8A5A00` | `#FFFFFF` | 5.93 | 4.5 | **pass** |
| Warn (light) on bg | `#8A5A00` | `#F6F5F3` | 5.44 | 4.5 | **pass** |
| Input border (light) | `#5C5C62` | `#FFFFFF` | 6.64 | 3 | **pass** |
| Gain vs loss (dark), hue-separated | `#3DBE8B` | `#FF6A3D` | 1.21 | - | n/a (distinguish by hue + ▲/▼) |
| Accent vs loss (dark), hue-separated | `#C41A42` | `#FF6A3D` | 2.07 | - | n/a (distinguish by hue + ▲/▼) |

**Rules that follow from the FAILs**
- `#6D001A` is never text, an icon or a button fill on dark backgrounds. Use it only as a large surface with off-white text on it.
- Don't use `#C41A42` on surface-2. Founder's `#B5123A` is OK only on pure `#000`, which we no longer use.
- Gain, loss and accent are told apart by hue plus a sign and arrow, never by lightness alone.

**Before → after**

| | v0.1 | v0.2 |
|---|---|---|
| Dark bg | `#000000` | `#0A0A0A` |
| Dark text | `#FFFFFF` | `#F2F0ED` (17.41:1) |
| Dark secondary text | `#8A8A90` (6.12) | `#9A9894` (6.88) |
| Dark primary button | burgundy fill (1.57:1 boundary, FAIL) | off-white fill, black text (17.41) |
| Dark accent | pink `#F07A8F` | burgundy accent `#C41A42` (3.37), no pink |
| Gain (dark / light) | `#2BD67B` / `#0F7A3D` | jade `#3DBE8B` (8.43) / `#0E7A52` (5.35) |
| Loss | `#FF6A3D` / `#C2410C` | unchanged (6.96 / 5.18) |

## 5. Typography

### Pairing A (recommended): **Anton + Inter**
- **Display: Anton** (Google Fonts, 400). Heavy, condensed, all caps. It is the closest free match to the moodboard's vertical type.
  - Uppercase only, letter-spacing +0.5%.
  - Used for hero headlines, basket names on the detail hero, section kickers on the landing page, and share cards.
  - Never used for numbers in tables, or for body text.
- **UI: Inter** (variable, 400/500/600/700). Turn on `font-feature-settings: "tnum" 1, "cv11" 1, "ss01" 1`. Tabular numerals keep prices, PnL and weights aligned.
- **Mono (addresses and tx hashes only): JetBrains Mono** 400.
- Why: Anton gives the CAESAR poster energy, and Inter keeps finance screens calm and legible on cheap Android screens.

### Pairing B: **Big Shoulders Display + Geist / Geist Mono**
- **Display: Big Shoulders Display** 800–900. Condensed, with a slightly more "futuristic" Chicago-industrial cut. It matches the VR-headset-on-a-bust side of the moodboard.
- **UI: Geist** 400–600, and **Geist Mono** for numbers in dense tables.
  - Geist's tabular-figure support is unconfirmed. If `tnum` isn't there, use Geist Mono for numeric columns.
- Why: it feels more "Pendle/Morpho" crypto-native. Big Shoulders is less legible than Anton below 28px.

### Type scale (Pairing A)

| Token | Mobile | Desktop | Font | Line-height | Use |
|---|---|---|---|---|---|
| `display-xl` | 56/0.9 | 120/0.88 | Anton, UPPER | 0.9 | Landing hero |
| `display-l` | 40 | 72 | Anton, UPPER | 0.95 | Basket name on detail hero, section openers |
| `display-m` | 28 | 40 | Anton, UPPER | 1.0 | Card titles on landing, share cards |
| `num-xl` | 40 / 600 | 56 / 600 | Inter tnum | 1.0 | Hero value (NAV, portfolio total) |
| `title` | 20 / 600 | 24 / 600 | Inter | 1.25 | Screen titles, sheet titles |
| `body-l` | 17 / 400 | 18 / 400 | Inter | 1.5 | Thesis, long copy |
| `body` | 15 / 400 | 15 / 400 | Inter | 1.45 | Default |
| `label` | 13 / 500 | 13 / 500 | Inter | 1.3 | Stat labels, chips |
| `micro` | 11 / 500, +4% tracking, UPPER | 11 | Inter | 1.3 | Kickers, legal lines |
| `mono` | 13 | 13 | JetBrains Mono | 1.4 | Addresses, hashes |

Minimum body size on mobile is 15px. Legal text is never smaller than 11px.

---

## 6. Spacing, radius, elevation, motion

- **Spacing (4-pt):** 4, 8, 12, 16, 20, 24, 32, 40, 56, 80. The mobile gutter is 16. Card padding is 16 on mobile and 24 on desktop.
- **Radius:** 4 (chips, inputs), 12 (cards), 20 (bottom sheets, top corners only), 999 (pills).
  - Square-ish corners keep it editorial. Avoid bubbly 24+ radii.
- **Elevation:** none in dark mode. Use surface steps plus a 1px border.
  - Light mode: `0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)` for sheets only.
- **Motion:** 150ms ease-out for taps, 240ms for sheets.
  - Numbers tick, they don't bounce.
  - No confetti. One exception: a single "smoke" fade on the share card after creating a basket.
- **Touch targets:** at least 44×44. The primary CTA is 52px tall and full-width on mobile.

---

## 7. Charts

- The NAV line is `text` colour (off-white #F2F0ED on dark, #0A0A0A on light). It is **not** green or red.
  - The period change chip carries the gain/loss colour.
  - This keeps the screen from flipping colour daily and keeps burgundy in charge.
- Creator vs follower lines: creator is dashed `ink-400`, follower is solid `text`.
- Area fill is 8% of the line colour. The gridlines are `border`.
- Rebalance markers sit on the chart as small accent (#C41A42) ticks with a tooltip showing the reason.
- Every chart carries "Past performance isn't a promise." in `micro`.

---

## 8. Burgundy-area check (10% rule)

`wireframes.html` and `motion-prototype.html` are checked by rendering in headless Chrome and counting pixels per frame.
- **Counts as burgundy:** hue 325–360° or 0–6°, HSV saturation ≥ 0.6, value ≥ 0.25. This catches #6D001A, #C41A42 and their mid shades.
- **Doesn't count:** near-black shadows and pale tints. Loss vermilion (hue ~14°) is excluded.
- **Threshold:** ≤ 10% of the frame. Results are listed in the round-2 report.
