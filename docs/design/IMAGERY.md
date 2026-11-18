# Alloy: imagery (v1)

2026-11-19. This file is the companion to TOKENS.md (v0.3: §9 gold, §10 jewel tones) and to `wireframes-v2.html`, where every image is drawn as CSS/SVG art.

**Rule zero: images carry meaning, not decoration.** Each image answers one of four questions:
- *What is this basket about?* (cover)
- *Who made it?* (avatar)
- *What's inside?* (stock logos)
- *What just happened?* (state visual)

If an image answers none of them, cut it. Images never push a screen past its word budget, the 10% burgundy limit or the 3% gold limit.

---

## 1. Art direction

**Mood:** editorial and high-contrast on near-black. Burgundy silk and white smoke appear only as **textures**.

**No mascot, no characters, no statues** (founder decision 2026-11-19: an AI-art cliché that means nothing to our users, and premium finance brands don't use mascots). The imagery is the jewel-tone basket covers, real product moments and Anton type.

### 1.1 Duotone recipe (basket covers)
Every cover is rendered in its basket's jewel tone, so the cover is the basket's identity colour.

1. Desaturate the source to greyscale. Then raise contrast with levels: black point 8%, white point 92%.
2. Map greyscale to a gradient: shadows → **deep**, highlights → **mid**, with the mid stop at 60%.
3. Composite over `linear-gradient(160deg, deep 0%, #0A0A0A 85%)`, so the bottom-left always falls to the UI background.
4. Add grain: monochrome noise at 6–10% opacity (SVG `feTurbulence` baseFrequency .9 in the wireframes).
5. Add a vignette: 20% darkening at the edges.

| Tone | Deep | Mid | Theme motif in seed covers |
|---|---|---|---|
| Burgundy | `#3A0010` | `#B5304F` | Capitol dome + columns + filing lines (story baskets) |
| Emerald | `#0F2E24` | `#2E8B6A` | Server racks / data grid (big tech) |
| Sapphire | `#10223F` | `#3E6FB8` | Chip + circuit traces (AI, compute) |
| Amber | `#3A2A08` | `#C98A2E` | Mountain + crossed pick and shovel (picks & shovels) |
| Plum | `#2A1433` | `#8E5BA6` | Planet + ring + launch trail (space) |

A burgundy-tone cover counts toward the 10% burgundy budget wherever the mid stop shows. The worst wireframe frame measures 2.41%.

### 1.2 Brand imagery (not tied to a basket)

| Asset | Look | Used on | Never on |
|---|---|---|---|
| **Wordmark composition** | Giant Anton **ALLOY** (or the headline) in outline or solid off-white over silk/smoke texture | Landing hero, 404, share/OG card corner mark | Inside money flows |
| **Burgundy silk** | One flowing ribbon of satin (#6D001A, highlights ≤ #8C1230), on black | Landing hero band, change-notice sheet header (46px band) | Behind text; more than one ribbon per screen |
| **White smoke** | Soft volumetric smoke at 8–16% opacity | Landing background, success moments | Behind numbers or controls |

### 1.3 State visuals instead of copy
- **Drift → trim:** a 96×28 bar. A faint bar shows the old weight and a solid bar the new one, with a dashed amber line at the band edge. Used in Activity and the basket feed.
- **In-kind exit ("your stocks"):** an overlapping stack of the basket's stock logos at 32px. Used in Exit › Get the stocks and on that flow's success screen.
- **Market closed:** a moon + clock line icon in warn amber, beside "Opens Mon 8:00 PM".
- **Loading:** the basket's own cover tile plus a 3px accent progress line. No spinners in flows longer than 2s.
- **Empty states:** one image (a single-colour line mark, a jewel cover fragment, or the silk band) + one line + one button.

### 1.4 Crop and composition
- Keep the subject in the **right two-thirds**. The left third and bottom 40% are reserved for text on hero bands and share cards.
- No characters, faces, busts or statues anywhere.
- No faces of real people. No real brand logos in cover art. No recognisable buildings other than a generic dome silhouette for "Capitol".

### 1.5 Text over images (AA)
Paper text (#F2F0ED) over raw mid tones is **not** always safe. These ratios are script-computed:

| Under the text | Paper contrast |
|---|---|
| Sapphire mid #3E6FB8 | 4.43 (fail) |
| Emerald mid #2E8B6A | 3.68 (fail) |
| Amber mid #C98A2E | 2.58 (fail) |
| Plum mid #8E5BA6 | 4.40 (fail) |
| Burgundy mid #B5304F | 5.27 |
| **Any mid under a 60% #0A0A0A scrim** | **8.89–12.38** |
| Any deep stop | ≥ 12.19 |

**Rules:**
- Any text on an image sits on a **scrim**: `linear-gradient(to top, rgba(10,10,10,.6–.85) 0%, transparent 60%)`, or on the deep stop.
- Never put text over a raw mid tone.
- Numbers never go on images. The only exception is the share card, which is itself an image (see §3).

---

## 2. Image list for launch (Dec 4)

All raster images are **AVIF first, WebP fallback**. Use `srcset` at 1×/2×, `loading="lazy"` and `decoding="async"` below the fold, and `fetchpriority="low"` everywhere except the landing hero. The landing hero text is the LCP element, not the image. Every image gets a ≤ 2kb blurred placeholder (or the CSS jewel gradient for covers).

| # | Asset | Where | Size (CSS px → export) | Budget | Notes |
|---|---|---|---|---|---|
| 1 | Landing hero (silk + smoke texture behind Anton type and 3 fanned basket covers) | Landing mobile + desktop | 390×430 → 780×860; 1200×540 → 2400×1080 | **≤ 120kb** desktop, ≤ 80kb mobile | Art-directed crops (`<picture>`); text-safe left third |
| 2 | Alloy wordmark/mark | Share/OG card corner, X avatar, 404, favicon | SVG | < 4kb | Off-white on #0A0A0A; the avatar must read at 48px |
| 3 | Silk band | Change-notice sheet header, landing section dividers | 390×46 → 780×92; 1200×200 | ≤ 15kb / ≤ 40kb | Can be SVG |
| 4 | Smoke texture | Landing, success moments | 1200×800, tileable | ≤ 30kb | Grayscale WebP at 8–16% opacity; or CSS radial gradients |
| 5 | Seed basket covers ×5 (+ 3 demo) | Explore card, basket hero, Portfolio/Activity tile, share + OG card | Master 1600×900 → card 390×88 (2×), hero 390×120 / 1200×150, tile 44×44, OG 1200×630, share 1080×1350 | Card ≤ 30kb, hero ≤ 60kb, OG ≤ 120kb | Duotone per §1.1, one master per basket |
| 6 | Generic covers ×5 (one per tone) | Creator-made baskets until custom art exists | As #5 | As #5 | The creator picks a tone (Create step 1) and gets the generic motif |
| 7 | Stock logos ×10 | Everywhere a stock appears | 24/32px circles | n/a | **Source: the `icon_url` field of Coinbase's tokenized-stocks API** (`https://api.coinbase.com/v1/tokenized-stocks`). Cache at build time. Fallback: a colour monogram on surface-2 |
| 8 | Creator avatars | Cards, basket page, Activity, Me | 20/28/48px | ≤ 8kb | User upload (crop to circle) or a generated gradient avatar (as in wireframes); gold ring = creator |
| 9 | OG images per basket | X link previews | 1200×630 | ≤ 120kb PNG/WebP | Server-rendered (`opengraph-image.tsx`): cover + name + 3 logos + **TEST** watermark on testnet |
| 10 | Share cards (follower / creator) | Post-buy, post-create | 1080×1350 | ≤ 200kb PNG | Cover + Alloy wordmark + Founding # badge (gold) + **TEST** watermark |
| 11 | State icons (moon/clock, trim bar, logo stack, empty marks) | States | SVG | < 2kb each | Inline SVG, `currentColor` |

**Logo licensing note.**
- Company logos are trademarks. Use them only to identify the stock, at small size, unaltered, and never in cover art or marketing images.
- Confirm Coinbase's API terms permit display. If not, use monograms.
- Never show the Coinbase or Base logos in a way that implies endorsement (ARCHITECTURE §7).

---

## 3. Sourcing plan

| Asset | Recommended source | Why |
|---|---|---|
| Silk, smoke | Stock footage/photos (Unsplash/Pexels) or **AI generation** (Midjourney, Ideogram or Flux) | Textures only; easy to keep consistent |
| Basket covers | **AI generation in one batch from one style prompt**, then the duotone script (§1.1) | Consistent series. Themes are abstract objects, so there are no likeness issues. |
| Textures (marble, grain) | Licensed stock (Unsplash/Pexels), or generated | Both fine |
| Stock logos | Coinbase API `icon_url` | Authoritative, per token |
| Avatars | User uploads; generated gradient fallback | — |

**Licensed stock:**
- The Unsplash License and the Pexels License allow free commercial use without attribution. Neither allows selling the photo unaltered or implying endorsement by people or brands shown.
- Avoid photos with logos, identifiable people or trademarked buildings.
- Record every URL and its licence in a `credits.md` before shipping.

**AI images:**
- Check the generator's commercial-use terms for the plan used.
- Don't prompt for a real person's likeness or for "in the style of" a living artist.
- Keep the prompt plus the seed in `credits.md`.

**Wireframes v2 credits:** none needed. Every image in `wireframes-v2.html` is original CSS/SVG made for this project (cover motifs, silk band, avatars, grain filter). No external images are loaded.

### 3.1 Ready-to-use AI prompts (brand palette)
Shared style suffix for every prompt:
> `, editorial still life, near-black background #0A0A0A, deep burgundy #6D001A accents, warm off-white #F2F0ED highlights, subtle film grain, high contrast, soft rim light, minimal composition, negative space on the left third, no text, no logos, no watermark --ar {ratio} --style raw`

1. **Burgundy silk:**
   > `A single flowing ribbon of deep burgundy satin silk, liquid folds, specular highlights, floating horizontally across a black void` + suffix (`--ar 21:9`)
2. **White smoke:**
   > `Soft volumetric white smoke wisps, slow and calm, low density, on pure black, studio photograph` + suffix (`--ar 3:2`); export greyscale.
3. **Cover: The AI Build-Out (sapphire):**
   > `Macro photograph of a single silicon chip on a dark circuit board, glowing traces leading out of frame, a hint of a data-centre aisle in soft focus behind` + suffix (`--ar 16:9`) → duotone sapphire.
4. **Cover: Capitol Tech (burgundy, story):**
   > `Abstract silhouette of a neoclassical dome with columns, stacks of paper filings in the foreground, low-key lighting, no flags, no identifiable building` + suffix (`--ar 16:9`) → duotone burgundy.
5. **Cover: Big Tech, Trimmed (emerald):**
   > `Rows of server racks with tiny status lights receding into darkness, symmetrical, quiet` + suffix (`--ar 16:9`) → duotone emerald.
6. **Cover: Picks & Shovels (amber):**
   > `A pickaxe and a shovel crossed in front of a dark mountain ridge, dust in the air, gold-hour rim light` + suffix (`--ar 16:9`) → duotone amber.
7. **Cover: Space Race (plum):**
   > `A ringed planet at the edge of frame and a thin rocket launch trail arcing across a star field` + suffix (`--ar 16:9`) → duotone plum.
8. **Demo-lab covers:** reuse 3, 5 and 7 with a "DEMO" chip in UI (never baked in).

---

## 4. Alt-text rules

1. **Meaningful images get alt text that names the meaning, not the picture.**
   - Cover: `alt="The AI Build-Out cover"`. It's the basket identity; the theme is in the name.
   - Logo: `alt="NVIDIA"` (company name, not "logo"). In a row of logos, the row gets `role="img" aria-label="NVIDIA, Microsoft, Alphabet and 2 more"` and the individual logos get `alt=""`.
   - Avatar: `alt="@kavya"`.
   - State visual: say the fact. `aria-label="Trimmed 41 to 40 percent"`, `aria-label="Market closed"`.
2. **Decorative images get `alt=""` / `aria-hidden="true"`:** silk, smoke, grain, and line marks on empty states when the line below carries the message.
3. **No text baked into images**, except share/OG cards. Those carry the same text in their `og:title` / `og:description`, and the share sheet's `alt` repeats the card's words: `alt="Founding Follower #212 of The AI Build-Out. Test network."`.
4. **Keep it short:** ≤ 12 words. No "image of".
5. **Localisation:** alt text goes through the same i18n strings as UI copy.

---

## 5. Checklist per new image
- [ ] It answers one of the four questions (rule zero).
- [ ] Duotone in the basket's tone, or a brand asset from §1.2.
- [ ] Text on it sits on a scrim (≥ 4.5:1).
- [ ] The screen stays ≤ 10% burgundy and ≤ 3% gold (run the pixel check).
- [ ] AVIF/WebP, within the size budget, lazy unless it's the hero, with a blurred placeholder.
- [ ] Licence or prompt + seed recorded in `credits.md`.
- [ ] Alt text per §4.
