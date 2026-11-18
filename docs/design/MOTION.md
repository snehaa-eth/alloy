# Alloy: motion spec (v0.1)

Companion files:
- `motion-prototype.html` (open it in a browser and scroll),
- `TOKENS.md` (colour and type),
- `COPY.md` (strings).

Research ran on 2026-11-19 via web search. Items marked *(verify)* are from product knowledge or secondary sources and should be checked by watching the live app.

---

## 1. Principles

1. **Motion explains a change.** Each animation answers "what just happened?" or "where did that come from?". If it answers neither, cut it.
2. **Money stays still while you decide.**
   - Inside the Buy, Sell or Withdraw sheet, quote numbers update by **instant swap with a 120ms fade**, never a rolling ticker.
   - A rolling number during a decision feels like a slot machine and hides the real value mid-roll.
   - Tickers are for *passive* viewing only: portfolio total, basket price.
3. **Brand on the landing page, quiet in the product.** Parallax, big type moves and smoke live on marketing pages only. Product screens get micro-interactions under 300ms.
4. **No celebration of trading.** Robinhood dropped its confetti in 2021 after Massachusetts regulators cited it as gamification [R3].
   - Success = a calm check-mark draw plus facts ("2.30 AIB tokens added").
   - The one brand moment we allow is the *creator launch* share card, a single smoke fade. That celebrates making something, not trading.
5. **Never block the user with motion.**
   - Every transition can be interrupted.
   - Nothing over 400ms stands between a tap and the next action.
   - Scroll stays native (no scroll-jacking).
6. **Reduced motion is a first-class design**, not "animations off". Every spec below lists its reduced variant.
7. **Motion never adds burgundy area.**
   - Animated accents (progress, ticks, rings, the hold bar) use the small accent #C41A42.
   - Large animated surfaces stay neutral, so no screen goes over the 10% burgundy rule mid-animation.
   - Prototype viewports measure at most 2.3%.
8. **Cheap phones first.**
   - Animate `transform` and `opacity` only.
   - Parallax is off on low-power devices.
   - Art is lazy-loaded.
   - If it drops frames on a ₹10k Android, it ships in the reduced variant there.

---

## 2. Research: what moves, when, why it works

| Source | What moves, when | Why it works | Steal | Avoid |
|---|---|---|---|---|
| **Robinhood** | Portfolio number rolls digit by digit when it changes (open-sourced as `robinhood/ticker`, Android) [R1]. Line chart scrubs under the finger; the headline number follows the finger and the chart dims to the right of it (Spark library supports scrubbing) [R2]. Haptic tick while scrubbing *(verify)*. Confetti on milestones until 2021 [R3]. | Digit roll shows *which* digits changed, so a 0.01 change looks small and a 100 change looks big. Scrub turns a chart into an answer ("what was it on Oct 30?"). | Digit-roll ticker on passive numbers. Scrub with the hero number following. Dim the future part of the line. | Confetti and celebratory trade animations (regulator attention, and wrong for first-time investors). |
| **Coinbase** | Asset price chart scrubs. Buy flow slides between amount → preview with a shared header. Calm fades on success *(verify)*. | Continuity: the amount you typed "travels" to the preview, so you trust it's the same number. | Shared-element continuity: amount → review → receipt. | Long spinner screens with no progress. Show stages ("Buying… 2 of 3"). |
| **Revolut** | Card and balance carousels with spring physics. Number roll on balance. Bottom sheets with rubber-band overscroll *(verify)*. | Springs make big surfaces feel physical without long durations. | Spring for sheets (stiffness high, no bounce). Overscroll stretch on sheets. | Dense carousels; too much moving at once on the home screen. |
| **Cash App** | Big amount keypad: the number scales slightly per keypress, and a shake on invalid amount *(verify)*. | Feedback lives on the number itself, so the eye never leaves it. | Keypad "pop" (scale 1.04 → 1, 120ms). Shake on invalid (3 cycles, 4px). | Playful colours on money states. |
| **smallcase** | Mostly static. Rebalance update shows old → new weights as a list *(verify)*. | Clarity over flair; the trust audience is conservative. | Before → after weights, which we animate as a morph. | Making the user do the rebalance. |
| **eToro** | Copy flow with sliders and a pie of the copied portfolio. Feed cards animate in *(verify)*. | Social proof feels live. | Feed insert animation for new rebalance items. | Social feed noise next to money controls. |
| **Stripe** | Animated WebGL mesh gradient (a "minigl" shader) behind the hero [R4]. The globe is WebGL [R5]. | Ambient motion signals "alive, technical" without carrying information. | Ambient background motion for the hero only (our smoke). | WebGL on low-end phones: commenters report battery drain [R4]. We do smoke with CSS gradients and transform only. |
| **Linear** | Long-scroll "Method" storytelling; product UI sequences tied to feature names as you scroll [R6][R7]. | One idea per viewport, with the visual changing in place, so readers don't lose their spot. | **Sticky storytelling**: one pinned visual that changes as the copy steps past. This is our drift → rebalance explainer. | Over-long scroll sections (>4 screens) that bury the CTA. |
| **Vercel** | Grid and line reveals, subtle fade-up on section enter *(verify)*. | Fast and restrained; reveals finish before you read. | Fade-up 12px / 240ms for section reveals, once only. | Re-triggering reveals on every scroll back. |
| **Apple product pages** | Scroll-scrubbed image sequences and pinned sections *(verify)*. | The product is the story. | Scrubbing our basket diagram, not video. | Heavy image sequences (MBs) for our data budget. |
| **Pendle / Morpho / Aave** | App UIs are mostly static. Number transitions on APY and health factor; modal fades. Marketing sites use slow ambient gradients and 3D tokens *(verify)*. | DeFi trust = stability. Motion is mostly on marketing pages. | Same split: ambient on marketing, quiet in the app. | 3D token spinners. |
| **Uniswap** | Swap card: the token switch arrow rotates 180°, numbers re-quote with a fade, and the "price updated" banner slides in *(verify)*. | Small motions tie cause to effect (I flipped → it flipped). | Inline re-quote banner slide (we already spec "Price moved"). | — |
| **Base.org** | Blue square brand device with bold, playful motion on marketing pages *(verify)*. | Brand recall. | Our square (logo dot) could pulse as a loading mark. | Copying Base's visual language. We must not look affiliated (ARCH §7). |
| **Phantom** | Mascot and illustrations with springy, characterful micro-animations. Smooth tab transitions *(verify)*. | Personality lowers crypto anxiety. | A tiny bit of personality in empty states (a line-mark plinth that draws in). | Cute mascots; off-brand for CAESAR. |
| **Editorial / fashion (Awwwards parallax tag [R8])** | Oversized condensed type that slides horizontally at a different speed than the page. Images with mask reveals. Grain and smoke overlays. Vertical type rails. | Speed differences between layers create depth (parallax) from type alone, without heavy imagery. | **Headline words drifting at different speeds**, a vertical rail that counter-scrolls, and a mask reveal on the bust. | Smooth-scroll hijacking, custom cursors, preloaders (for our users these cost seconds of data and battery). |

**Platform facts behind the library pick**
- GSAP and every plugin (ScrollTrigger, SplitText) are now free, including commercial use, after Webflow's acquisition [R9].
- Motion (ex-Framer Motion):
  - the full `motion` component is ≈43kb gz,
  - `LazyMotion` + `m` starts at ≈5kb,
  - `useAnimate` mini is 3.3kb [R10].
- CSS scroll-driven animations (`animation-timeline: scroll()/view()`):
  - Chrome/Edge 115+, Safari 26, Firefox 159, so now Baseline [R11][R12].
  - Still feature-detect with `@supports`.
- Lenis is ≈4–5kb gz. Thoughtworks Radar flags accessibility issues with smooth-scroll libraries [R13].

---

## 3. Library pick

**Pick: `motion` (motion/react) with `LazyMotion` + `domAnimation`, plus native CSS scroll-driven animations. No GSAP, no Lenis in the app.**

| Need | Tool | Why |
|---|---|---|
| Micro-interactions, sheets, layout changes (donut morph, list inserts, shared elements) | `motion/react` `m.*` + `LazyMotion features={domAnimation}` (~5kb initial, ~15kb features loaded async) [R10] | React 19 / Next 16 native, declarative, `AnimatePresence` for sheets and feed items, `useReducedMotion()` built in, spring physics. |
| Scroll reveals, parallax, sticky storytelling progress | CSS `animation-timeline: view()` / `scroll()` with `@supports` | Runs off the main thread (compositor). Zero JS, so no jank on low-end Android. Baseline in all engines [R11]. |
| Fallback for browsers without scroll timelines | Motion `useScroll` + `useTransform` (already in bundle) | One code path, no second library. |
| Number ticker | Own 1kb component (CSS `transform: translateY` per digit column) | Libraries like react-animated-counter exist, but ours must respect the "no motion while deciding" rule. |
| Chart draw / scrub | SVG `stroke-dashoffset` + pointer events | No charting-library animation needed. |

**Why not GSAP?** It's excellent and free now [R9], but ~25kb+ gz core plus ScrollTrigger *(verify current size)* duplicates what Motion + CSS do, and it's imperative, which fits React Server Components less naturally. Use it only if the landing grows into a full Awwwards-style piece. If so, load it on the `/` route only, via dynamic import.

**Why not Lenis?** Smooth scroll fights native momentum on Android, adds input latency, and raises accessibility risk [R13]. Native scroll plus scroll-driven CSS gives the same parallax.

**Budget:**
- All motion JS on product routes is **≤ 20kb gz**.
- The landing page adds 0kb for scroll effects (CSS).
- Hero art totals **≤ 120kb** (AVIF/WebP, lazy, with a blurred 2kb placeholder).

---

## 4. Tokens

### Duration
| Token | ms | Use |
|---|---|---|
| `dur-instant` | 80 | Press states, checkbox |
| `dur-fast` | 120 | Value swap fade, chip select, keypad pop |
| `dur-base` | 200 | Tooltips, tabs, list item enter |
| `dur-sheet` | 280 | Bottom sheet open (close = 220) |
| `dur-page` | 240 | Route transitions |
| `dur-draw` | 600 | Chart line draw, check-mark draw |
| `dur-hold` | 600 | Hold-to-confirm fill |
| `dur-morph` | 700 | Donut / weight bar morph on rebalance |
| `dur-ticker` | 450 | Digit roll (staggered 30ms per column, right-to-left) |

Nielsen Norman's guidance puts most UI animation at 100–500ms [R14]. Nothing in the product exceeds 700ms, and those 700ms cases are passive (nobody is waiting on them).

### Easing
| Token | Curve | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entrances, sheets, reveals (default) |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits only |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Morphs, chart draw |
| `linear` | `linear` | Hold-to-confirm fill (progress must look honest), scroll-linked |
| `spring-sheet` | Motion `{type:"spring", stiffness: 520, damping: 46}` (no visible bounce) | Sheets, cards |
| `spring-pop` | `{stiffness: 700, damping: 30}` | Keypad pop, chip select |

### Distance
- Reveal offset is 12px (mobile) / 24px (desktop).
- Sheet travel is the full height.
- Card lift: `translateY(-2px)` with the shadow growing by 4px.

### Parallax speeds (landing only)
| Layer | Speed (× scroll) |
|---|---|
| Smoke (back) | 0.15 |
| Silk | 0.3 |
| Bust | 0.5 |
| Headline line 1 / 2 / 3 | X-drift −8% / +6% / −4% of viewport over the hero's scroll range |
| Vertical rail | Counter-scroll −0.2 |

---

## 5. Per-screen specs

Each spec gives **Full** motion, then **Reduced** (`prefers-reduced-motion: reduce`, or the in-app "Reduce motion" setting), then **Low-power**.

### 5.1 Landing hero (parallax)
- **Full**
  - Four layers: smoke, silk, bust, type. Each translates on Y at its speed while the hero is in view (CSS `animation-timeline: view()`, range `exit 0%`→`exit 100%`).
  - Headline lines drift horizontally in alternating directions.
  - The vertical "TOKENIZED US STOCKS · ON BASE" rail counter-scrolls.
  - On first load:
    - the bust is revealed by a clip-path mask from the bottom (800ms, once),
    - the headline words rise 24px with a 60ms stagger,
    - the smoke drifts ambiently (CSS keyframes, 20s loop, `translate` + `opacity` only).
- **Reduced**
  - All layers static.
  - The headline is visible immediately, with no mask reveal.
  - The smoke is a still image.
- **Low-power**
  - Same as reduced, but with the 200ms fade-in kept.
  - Low-power triggers:
    - `navigator.deviceMemory ≤ 2`,
    - `navigator.hardwareConcurrency ≤ 4` on mobile,
    - `Save-Data: on` / `navigator.connection.saveData`,
    - or a measured frame time > 24ms over the first 30 frames.

### 5.2 Landing: "How it works" sticky storytelling
- **Full**
  - A 4-step section about 300vh tall, with the visual pinned (`position: sticky`) and the steps scrolling past:
    1. **Pick a story.** A basket card assembles: five stock chips fly into a bar (translate + opacity).
    2. **Put in USDC.** "$25" drops in and splits into five coloured segments sized by weight.
    3. **Prices drift.** The NVDA segment grows 35% → 41% and the others shrink. A "5-pt band" bracket appears and NVDA pokes past it, highlighted.
    4. **We trim back.** NVDA eases to 40% (band edge, not target, which is a real Balanced-mode detail). A feed line slides in: "Nov 14 · Trim · NVDA 41% → 40% · Cost $1.90".
  - Progress comes from scroll position (scroll-linked, not time-based), so users control the pace and can scrub back.
- **Reduced**
  - No pinning. Four static panels stacked, each showing its end state with the caption. Same content and same order.
- **Low-power**
  - Pinning kept (cheap), but steps jump between states with a 120ms crossfade instead of continuous interpolation.

### 5.3 Explore cards
- **Full**
  - Cards fade-up 12px on first enter, staggered 40ms, max 6 at a time.
  - Hover (desktop): lift −2px with a shadow.
  - Tap (mobile): scale 0.98 for 80ms, then navigate.
  - Sparklines draw in (`stroke-dashoffset`, 600ms) when 50% visible, once.
  - The follower-return number does **not** tick on load; it's just there.
- **Reduced**: no stagger, no draw (sparkline shown complete), tap uses an opacity 0.85 press state.
- **Low-power**: no draw, no stagger.

### 5.4 Basket page
- **NAV chart draw**
  - Full: the line draws left → right in 600ms on first view, and the area fill fades in after.
  - Range change (1W → 3M): the old line crossfades to the new one over 200ms and the y-axis eases. No redraw from zero.
- **Scrub**
  - Press and drag on the chart.
  - Hero number and date follow the finger.
  - The line right of the finger dims to 30%.
  - A vertical hairline and dot track the line.
  - At rebalance markers, an accent (#C41A42) tick grows and the reason tooltip appears.
  - **Haptic tick:** `navigator.vibrate(4)` each time the scrub crosses a day boundary on Android/Chrome. iOS Safari has no vibrate API, so it shows a visual tick only. Haptics must be user-toggleable (Me > Haptics).
  - Release: the number springs back to the current price over 200ms.
- **Live number tickers**
  - Basket price and portfolio total roll digit-wise when a new price arrives, at most once per 5s, only when the tab is visible, and **never inside a trade sheet**.
  - Each change shows a brief text flash (gain/loss colour, 600ms fade back to text colour) on the change chip, not the price.
- **Weight donut / bar morph on rebalance**
  - When a `Rebalanced` event arrives (or the feed item is opened), segments animate from old to new weights over 700ms ease-in-out.
  - The label for the changed stock counts up or down.
  - The feed item slides in from the top (height auto via Motion `layout`, 200ms).
- **Countdown (recipe change)**
  - Text countdown updates every second in the last hour, and every minute before that.
  - The banner has a thin progress line that shrinks to 0 over the notice window.
  - No pulsing (pulsing reads as alarm).
- **Reduced**
  - The chart appears complete.
  - Scrub still works (it's interaction, not decoration) with no dimming transition.
  - Tickers swap instantly.
  - The donut jumps to new weights, with a static "Changed" badge for 5s.

### 5.5 Buy / Sell sheet
- **Open**: spring from the bottom (280ms). The page behind scales to 0.96 and dims to 40% (iOS-style).
- **Amount keypad**
  - Each digit pops the amount (1.04 → 1, 120ms).
  - An invalid amount shakes (3 × 4px, 240ms) and the helper text swaps in.
- **Quote updates**: **120ms fade swap only.** No tickers (Principle 2).
- **Sell slider**
  - The thumb snaps to 25/50/75/All with a 4ms vibrate on each snap.
  - The readout swaps instantly.
- **Hold to confirm**
  - The button is off-white (#F2F0ED) with black text, the dark-mode primary.
  - On press, a darkening sweep plus a 4px accent (#C41A42) bar move left → right across the button, linear, 600ms.
  - Releasing early reverses the fill over 150ms and shows the hint "Keep holding to confirm".
  - When complete:
    - a 10ms vibrate,
    - the button morphs into a spinner pill reading "Buying… usually 5 seconds",
    - on receipt, a check mark draws (600ms) and the facts appear: "You're in. 2.30 AIB tokens added."
  - Keyboard: holding Space or Enter does the same, for accessibility.
- **Success**: no confetti. A single subtle accent (#C41A42) ring expands once behind the check (300ms, opacity 0.3 → 0).
- **Reduced**
  - The sheet fades in instead of sliding.
  - The hold fill is a stepped progress bar with the text "Hold… 3, 2, 1" (still a hold, so still safe).
  - The check appears without the draw.

### 5.6 Rebalance feed
- **Full**
  - A new item slides down from the top, pushing older items with a layout animation (200ms).
  - The timeline dot fills with the accent (#C41A42) for recipe changes.
  - A pending item has a dashed ring that slowly rotates (8s loop; stops at reduced).
  - Expanding an item reveals the cost breakdown (height animation 200ms).
- **Reduced**: instant insert with a 1s background highlight (burgundy-950 `#2A000A` on dark).

### 5.7 Page transitions (Next.js App Router)
- **Full**
  - Forward navigation: the new page fades in and slides 16px from the right (240ms). Back reverses it.
  - Explore card → basket page uses a shared element: the basket name grows into the hero title.
    - Motion `layoutId`, or the View Transitions API where supported. React 19 + Next 16 have experimental view-transition support *(verify before relying)*.
  - The tab bar stays fixed and never animates.
- **Reduced**: 120ms crossfade only.

### 5.8 Skeleton loaders
- **Full**
  - Skeleton blocks match the final layout exactly, so there's no layout shift.
  - A shimmer gradient sweeps at 1.6s per cycle using `transform: translateX` on a pseudo-element (not `background-position`, which repaints).
  - Shimmer stops after 8s and is replaced by "Still loading. Your connection looks slow." with Retry.
  - Content swaps in with a 120ms fade.
- **Reduced**: static grey blocks, no shimmer.

### 5.9 Pull to refresh (mobile web)
- **Full**
  - Native overscroll where available, with the Alloy square mark rotating 0→90° in proportion to the pull.
  - At the threshold it fills with the accent (#C41A42) and a 4ms vibrate fires.
  - On release the square spins (linear, 600ms loop) until done.
  - The "Updated just now" label fades in.
- **Reduced**: the square fills with no rotation, and the spinner becomes a dotted progress line.

### 5.10 Creator launch moment (the one celebration)
- **Full**: the share card (dark, with a burgundy header band) rises 24px while an off-white smoke layer fades from 0.6 → 0 across it (900ms, once). Then the "Share on X" button pulses once (scale 1 → 1.03 → 1).
- **Reduced**: the card fades in.

---

## 6. Performance rules (low-end Android budget)

1. **Animate only `transform` and `opacity`** (and `clip-path` for one-off reveals). Never animate `width`, `height`, `top`, `left`, `box-shadow` or `filter: blur` on scroll.
   - Donut segments use `stroke-dashoffset` on small SVGs. That's acceptable because it's not tied to scroll.
2. **Scroll effects run on the compositor**: CSS scroll timelines first. JS fallback reads scroll once per `requestAnimationFrame` with passive listeners and never writes layout.
3. **`will-change: transform`** only on active parallax layers, and only while the hero is in view. Remove it afterwards to free GPU memory.
4. **Lazy-load the hero art.**
   - `fetchpriority="low"`, AVIF ≤ 80kb mobile / ≤ 120kb desktop, with a 2kb blurred placeholder.
   - Never block LCP: the headline text is the LCP element.
5. **Low-power mode** (§5.1 triggers): parallax, ambient smoke loop, stagger and chart draw-in are all disabled.
6. **Budgets**
   - INP < 200ms.
   - Zero long tasks > 50ms caused by animation.
   - CLS 0 from skeleton → content.
   - Measure on a Moto G-class device (4GB RAM) and a Redmi 9A-class device (2GB) before launch.
7. **Pause off-screen loops** (smoke, pending ring) with IntersectionObserver and `document.visibilityState`.
8. **`prefers-reduced-motion`** is honoured globally through a single `MotionConfig reducedMotion="user"` at the root, plus a CSS media block. An in-app toggle (Me > Reduce motion) overrides it in both directions.
9. **No autoplay video.** No WebGL in v2.

---

## 7. References

- [R1] Robinhood Ticker (Android): https://github.com/robinhood/ticker; "Hello, Ticker": https://medium.com/robinhood-engineering/20eaf6e51689
- [R2] Robinhood Spark sparkline library (scrubbing): https://medium.com/robinhood-engineering/introducing-spark-dc17269b83f6
- [R3] CNBC, "Robinhood gets rid of confetti feature amid scrutiny over gamification" (2021-03-31): https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html; Finextra: https://finextra.com/newsarticle/37790/amid-gamification-accusations-robinhood-ditches-confetti
- [R4] Bram.us, "How to create the Stripe website gradient effect": https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect; GreenSock forum thread (battery): https://greensock.com/forums/topic/24837-animating-gradients/
- [R5] Stripe blog, "To design and develop an interactive globe": https://stripe.com/blog/globe
- [R6] Linear Method page teardown: https://webtrends.pages.dev/posts/linears-method-page-teardown
- [R7] Builder.io, "Scroll-driven animations": https://www.builder.io/blog/scroll-driven-animations
- [R8] Awwwards parallax collection: https://www.awwwards.com/websites/parallax/ (browse SOTD with the Parallax + Typography tags)
- [R9] Webflow, "GSAP becomes 100% free": https://webflow.com/blog/gsap-becomes-free
- [R10] Motion docs, "Reduce bundle size": https://motion.dev/docs/react-reduce-bundle-size
- [R11] web.dev, "New to the web platform in October 2026": https://web.dev/blog/web-platform-10-2026
- [R12] WebKit, "A guide to scroll-driven animations with just CSS": https://www.webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/
- [R13] Thoughtworks Technology Radar, Lenis: https://thoughtworks.com/radar/languages-and-frameworks/lenis; Lenis README: https://cdn.jsdelivr.net/npm/lenis@1.3.23/README.md
- [R14] Nielsen Norman Group, "Executing UX animations: duration and motion characteristics": https://www.nngroup.com/articles/animation-duration/
