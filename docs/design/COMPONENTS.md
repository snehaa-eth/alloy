# Alloy: component system (v3)

2026-11-19. Founder rule: **"Clean designs always and better UX."**

There is one anatomy per element, and every screen and card is a composition of these components. Each element's visual spec, states and do/don't live in `components-v3.html`.

The single source of truth is `cards-data/system.py`: tokens, component CSS and render helpers. `cards-data/build_v3.py` builds `components-v3.html`, `cards-v3.html` and `wireframes-v3.html` from it.

---

## 0. Rules that apply to everything

| Rule | Value |
|---|---|
| Primary actions | **One per surface** (screen, sheet or card). Everything else is secondary (outline) or quiet (text link). |
| Type | **Max 3 sizes per screen:** `--fs-hero` 32 · `--fs-body` 15 · `--fs-small` 12. |
| Fonts | **Inter** for text. **JetBrains Mono** for labels, meta and numbers in rows (it aligns, and it reads as data). **Anton** only for ONE hero element (Founding #, landing headline, a tab title). |
| Spacing | 4-pt scale: 4 · 8 · 12 · 16 · 20 · 24 · 32. Screen gutter 16. Card/sheet inset 16. Gaps 8/12. |
| Radii | 12 for inputs, banners and tiles · 20 for cards and sheets · pill (999) for buttons, chips, segmented controls and toasts · 50% for avatars and logos. Nothing else. |
| Colour | Tokens only (TOKENS.md v0.3). Burgundy ≤ 10% and gold ≤ 3% of any screen. Colour comes from content: jewel tones, stock logos, real-data art. |
| Contrast | WCAG AA. Text ≥ 4.5:1. UI boundaries ≥ 3:1. |
| Touch | ≥ 44px for every target. |
| Words | UX_MAP §0.1 budgets: card ≤ 16, sheet ≤ 20, basket fold ≤ 25, empty ≤ 10 + 1 CTA, error ≤ 12 + 1 action. |
| Icons | **Lucide**, one set, 24 grid, 1.75 stroke, round caps. Why: ISC licence, it's already in `apps/web` (`lucide-react`, tree-shaken per icon), and it has the full fintech set (arrows, scissors, moon, shield, award). Phosphor has more weights, which invites mixing. |

**Enforcement.** `cards-data/check_consistency.py` scans a page and fails on:
- colour literals outside `:root`,
- font sizes and radii that aren't tokens,
- inline styles beyond layout,
- SVG fill/stroke literals,
- classes not defined in the stylesheet.

All three v3 pages currently report **0 violations**. Doc scaffolding (`p-` classes) is exempt from the product rules.

---

## 1. Element anatomy (summary; visuals in components-v3.html)

| Element | Anatomy | States | Don't |
|---|---|---|---|
| **Primary button** | Pill 48px, full width in cards/sheets, paper fill `--tx`, ink text, Inter 15/600 | hover `--tx3` · pressed scale .98 · focus 2px accent ring with 2px gap · disabled `--s2` · loading spinner (label kept for width) | Two on one surface; burgundy fill on dark |
| **Secondary** | Outline pill, 1.5px `--bdi` | hover border `--tx` | Use as a second primary |
| **Quiet link** | 12/500 `--tx2` + chevron, 44px hit | — | More than one per card |
| **Icon button** | 44×44 circle, `--s2` | focus ring | Unlabelled icons for money actions |
| **Confirm** | Tap, with the amount on the label ("Buy $25", "Sell 30%"). The sheet is the review. | loading → toast | Hold-to-confirm, two-step modal |
| **Tag chip** | 24px pill, mono 12 uppercase +.08em, 12px icon. Intents: neutral / accent / warn / gold | — | Sentences; more than one tag per card |
| **Status pill** | 32px outline pill, 12 Inter; on = paper fill | on / off | Colour-coded pills |
| **Amount + presets** | Hero 32 centred + mono 12 derived line; presets $10 · $25 · $100; 44px keypad | error replaces the mono line | Max preset; animating money while deciding |
| **Field** | 48px, radius 12, 1.5px `--bdi`; help 12 below | focus (paper border + tint halo) · error (vermilion) · disabled | Placeholder-only labels for key inputs |
| **Fact row** | ≥ 40px, hairline top, key 12 Inter `--tx2`, value mono 12 | — | More than 2 on a card |
| **List row** | ≥ 56px; lead 32 (logo / jewel tile / icon button / avatar); title 15; meta mono 12; trailing mono 12 or 15/600 | — | Two-line titles; tinted rows |
| **Segmented** | Pill track `--s2`, 38px segments, active paper | — | > 3 segments |
| **Bottom nav** | Explore · Portfolio · Activity · Me; 24 icon + 12 label; active = paper + 2px accent bar | — | Badges > 9 |
| **Top bar** | 52px: icon button · 15/600 title · icon button | — | Titles in Anton (except tab roots) |
| **Status strip** | ONE 36px line; priority change < 24h → held for you → market closed → test | — | Stacked banners |
| **In-app bar** | Only inside X/IG/Telegram webviews: "Open in browser" | — | Showing in a real browser |
| **Sheet** | Radius 20 top, grab 36×4, inset 16; holds one card body; cards inside sheets drop their border | — | Sheets over sheets (only exception: the add-money detour) |
| **Toast** | Pill 48, icon + one line, 4s | success / error | Errors that need a decision |
| **Banner** | Radius 12, icon + one sentence: notice / closed / test | — | Repeating what the strip says |
| **Badge** | 24px pill, 12/600 gold + gold6 ring + metal dot | Founding / creator | Gold on prices or PnL |
| **Avatar / logo / tile / stack** | Avatar 32 (creator = gold ring); logo 24/32 full colour (source: Coinbase API `icon_url`); jewel tile 32 radius 12 for a basket; stacks overlap −6px | — | Ticker text where a logo fits |
| **Bars / donut / countdown** | Progress 4px accent; weights 8px in logo colours; donut 96; countdown mono 12, ticking, no pulse | — | Gain/loss colours for composition |
| **Charts** | **Dotted wave** (card header): REAL index, 48×12 dot matrix, ordered dither, jewel tone. **NAV line**: paper 2px, creator dashed, accent ticks, scrub dims the future | — | Synthetic data unless labelled; red/green lines |
| **Skeleton** | Same box as the content; `--s1`→`--s2`; stops after 8s | — | Spinners for page loads |
| **Empty** | Lucide icon 24 + one line ≤ 10 words + one button | — | Illustrations, mascots |
| **Error** | Icon + "what happened. Nothing spent." + one fix | — | Error codes |
| **Numbers** | One big number per surface; signed % = ▲ +x.x% jade / ▼ −x.x% vermilion; `Intl.NumberFormat` locale | — | Colour alone for direction |
| **Divider** | 1px `--bd` | — | Double borders |

---

## 2. How cards and screens use this
- **Cards** (CARDS.md) are compositions of: dotted-wave chart, tag chip + meta, context line, big number, fact rows, primary/secondary + quiet link, and optional badge/watermark.
- **Screens** (`wireframes-v3.html`) are compositions of: top bar or Anton tab title, ONE status strip, cards and list rows, a sheet, and the bottom nav.
  - The **photo cover appears only on the basket page hero** (`apps/web/public/brand/covers/*-800.webp`); everywhere else the basket is shown by its real-data dot art or a 32px jewel tile.
- Checks on wireframes-v3 (embedded in the page) cover all 19 screens:
  - 0 failures,
  - burgundy max 0.26%, gold max 0.33%,
  - ≤ 3 type sizes, ≤ 1 Anton element,
  - all word budgets met,
  - consistency 0.
