# Alloy: design tokens (v0.1)

These tokens come from the founder's "Project CAESAR" moodboard:
- **Black #000000, Burgundy #6D001A, White #FFFFFF**,
- heavy condensed uppercase headlines,
- an editorial, high-contrast feel,
- classical statue × future, burgundy silk, white smoke.

Contrast ratios are WCAG 2.x relative-luminance ratios, computed with a script (sRGB formula). AA needs **4.5:1** for body text, **3:1** for large text (≥24px, or ≥18.66px bold) and **3:1** for UI component boundaries.

---

## 1. Principles

1. **Burgundy is the brand, never a signal.** It marks the primary action, the selected state, and brand moments (hero, share cards). It never means loss, error or danger.
2. **Loss is orange-red (vermilion), gain is green.** Vermilion (~14° hue) sits well away from burgundy (~346° hue), so a loss number next to a burgundy button doesn't read as "brand". Every gain/loss number also carries a sign and an arrow (▲ +4.2% / ▼ −1.8%), so colour is never the only cue (colour-blind safe).
3. **Dark mode is the default.** It suits the moodboard. Light mode ("smoke") is a warm off-white, not a clinical #FFF everywhere.
4. **The interface is mostly monochrome.** Burgundy should cover under 10% of any screen.

---

## 2. Core palette

### Neutrals (ink)
| Token | Hex | Use |
|---|---|---|
| `ink-0` | `#000000` | Dark bg (brand black) |
| `ink-950` | `#0B0B0C` | Dark bg, elevated sheets |
| `ink-900` | `#141416` | Dark surface-1 (cards) |
| `ink-850` | `#1C1C1F` | Dark surface-2 (inputs, chips) |
| `ink-800` | `#26262A` | Dark hairline border (decorative) |
| `ink-700` | `#3A3A40` | Dark divider, strong border (decorative) |
| `ink-600` | `#6B6B70` | Dark **input border** (meets 3:1) / light disabled text |
| `ink-500` | `#5C5C62` | Light-mode secondary text |
| `ink-400` | `#8A8A90` | Dark-mode secondary text |
| `ink-300` | `#B3B3B8` | Dark-mode tertiary-but-readable text |
| `ink-200` | `#DADAD7` | Light hairline border |
| `ink-100` | `#ECEBE8` | Light surface-2 (inputs, chips) |
| `ink-50` | `#F6F5F3` | Light bg ("smoke") |
| `white` | `#FFFFFF` | Light surface-1 (cards) / dark primary text |

### Burgundy
| Token | Hex | Use |
|---|---|---|
| `burgundy-950` | `#2A000A` | Dark-mode tinted surface (selected card bg, notice banner bg) |
| `burgundy-900` | `#4A0012` | Pressed state for primary button |
| `burgundy-800` | **`#6D001A`** | **Brand. Primary button fill, selected tab underline, hero blocks** |
| `burgundy-700` | `#8C1230` | Hover on primary (dark mode) |
| `burgundy-600` | `#A30027` | Focus ring (light mode), links on light |
| `burgundy-300` | `#F07A8F` | **Accent text on dark** (links, active labels). Never on numbers. |
| `burgundy-100` | `#F6E6EA` | Light-mode tinted surface (notice banner bg) |
| `burgundy-50` | `#FBF3F5` | Light-mode selected row |

### Signal
| Token | Dark mode | Light mode | Meaning |
|---|---|---|---|
| `gain` | `#2BD67B` | `#0F7A3D` | Up, profit |
| `loss` | `#FF6A3D` | `#C2410C` | Down, loss, destructive |
| `warn` | `#F2B33D` | `#8A5A00` | Market closed, stale price, pending notice |
| `info` | `ink-300` | `ink-500` | Neutral info (no extra hue; keeps the palette tight) |

---

## 3. Semantic tokens

| Semantic | Dark | Light |
|---|---|---|
| `bg` | `#000000` | `#F6F5F3` |
| `surface-1` | `#141416` | `#FFFFFF` |
| `surface-2` | `#1C1C1F` | `#ECEBE8` |
| `sheet` (bottom sheets, modals) | `#0B0B0C` | `#FFFFFF` |
| `text` | `#FFFFFF` | `#000000` |
| `text-2` (secondary) | `#8A8A90` | `#5C5C62` |
| `text-3` (readable tertiary) | `#B3B3B8` on surface | `#5C5C62` |
| `border` (decorative hairline) | `#26262A` | `#DADAD7` |
| `border-input` (≥3:1) | `#6B6B70` | `#5C5C62` |
| `primary` / `on-primary` | `#6D001A` / `#FFFFFF` | `#6D001A` / `#FFFFFF` |
| `primary-hover` | `#8C1230` | `#4A0012` |
| `accent-text` | `#F07A8F` | `#6D001A` |
| `notice-bg` / `notice-border` | `#2A000A` / `#6D001A` | `#F6E6EA` / `#6D001A` |
| `focus-ring` | `#F07A8F` 2px | `#A30027` 2px |

---

## 4. Contrast ratios (checked)

| Pair | Ratio | Verdict |
|---|---|---|
| `#FFFFFF` on `#000000` | 21.00 | AAA |
| `#FFFFFF` on `#141416` | 18.40 | AAA |
| `#B3B3B8` on `#000000` | 10.06 | AAA |
| `#8A8A90` on `#000000` | 6.12 | AA |
| `#8A8A90` on `#141416` | 5.36 | AA |
| `#F07A8F` on `#000000` | 7.89 | AAA |
| `#F07A8F` on `#141416` | 6.91 | AA |
| `#FFFFFF` on `#6D001A` (primary button) | 12.61 | AAA |
| `#FFFFFF` on `#8C1230` (hover) | 9.36 | AAA |
| **`#6D001A` on `#000000`** | **1.67** | **Fail. Never use burgundy as text on black.** Use `#F07A8F` or a white-on-burgundy fill. |
| `#2BD67B` on `#000000` | 11.01 | AAA |
| `#2BD67B` on `#141416` | 9.64 | AAA |
| `#FF6A3D` on `#000000` | 7.38 | AAA |
| `#FF6A3D` on `#141416` | 6.47 | AA |
| `#F2B33D` on `#000000` | 11.29 | AAA |
| `#F2B33D` on `#141416` | 9.89 | AAA |
| `#000000` on `#F6F5F3` | 19.27 | AAA |
| `#5C5C62` on `#FFFFFF` | 6.64 | AA |
| `#5C5C62` on `#F6F5F3` | 6.09 | AA |
| `#6D001A` on `#FFFFFF` | 12.61 | AAA |
| `#6D001A` on `#F6F5F3` | 11.57 | AAA |
| `#6D001A` on `#F6E6EA` | 10.46 | AAA |
| `#0F7A3D` on `#FFFFFF` | 5.42 | AA |
| `#0F7A3D` on `#F6F5F3` | 4.98 | AA |
| `#C2410C` on `#FFFFFF` | 5.18 | AA |
| `#C2410C` on `#F6F5F3` | 4.75 | AA |
| `#8A5A00` on `#FFFFFF` | 5.93 | AA |
| `#8A5A00` on `#F6F5F3` | 5.44 | AA |
| `#6B6B70` on `#000000` (input border) | 3.96 | Passes 3:1 (non-text) |
| `#6B6B70` on `#141416` | 3.47 | Passes 3:1 (non-text) |
| `#26262A` on `#000000` | 1.39 | Decorative only. Never the only boundary of a control. |
| `#DADAD7` on `#FFFFFF` | 1.40 | Decorative only |
| `#FF6A3D` on `#6D001A` | 4.43 | **Fail for small text.** Never put loss numbers on a burgundy fill. |
| `#F07A8F` vs `#FF6A3D` | 1.07 | Same lightness, different hue. Hence the rule: rose accent never touches numbers, and loss always carries ▼ and −. |

---

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

- The NAV line is `text` colour (white on dark, black on light). It is **not** green or red.
  - The period change chip carries the gain/loss colour.
  - This keeps the screen from flipping colour daily and keeps burgundy in charge.
- Creator vs follower lines: creator is dashed `ink-400`, follower is solid `text`.
- Area fill is 8% of the line colour. The gridlines are `border`.
- Rebalance markers sit on the chart as small burgundy ticks with a tooltip showing the reason.
- Every chart carries "Past performance isn't a promise." in `micro`.
