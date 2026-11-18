# Procedural basket covers

These are code-generated cover masters for the seed baskets. They follow the duotone recipe in `docs/design/IMAGERY.md` §1.1 and the jewel tones in `TOKENS.md` §10.

| Slug | Tone | Scene |
|---|---|---|
| `capitol-tech` | burgundy | A generic domed colonnade, backlit, with light beams falling through the columns and paper filings in the foreground |
| `big-tech` | emerald | Server-rack aisle in one-point perspective, status LEDs, depth fog and a light at the end of the aisle |
| `picks-shovels` | amber | A crossed shovel and pickaxe in front of layered ridges at gold hour, with dust in the light |
| `ai-build-out` | sapphire | A silicon chip on a circuit board in perspective, glowing traces running out of frame, rim light from the back right, and the server aisle defocused behind |
| `space-race` | plum | A ringed planet (shaded per pixel) at the frame edge and a rocket trail arcing through a star field |

## How it works
- `covers.html#<slug>` loads `covers.js`. The script paints the scene in greyscale on a 1600×900 canvas.
- It then applies bloom, a 160° shadow lift, a vignette of about 20%, and grain of about 7%.
- Finally it maps luminance through a LUT: near-black → deep → mid → mid/paper tint.
- Every random value comes from a fixed seed (mulberry32 + value noise), so renders are byte-identical.
- The subject sits in the right two-thirds. The left third is kept dark for text.

## Render
```
bash docs/design/covers-src/render.sh            # all five + contact sheet
bash docs/design/covers-src/render.sh big-tech   # one cover
```
This uses headless Chrome from `/Applications` and `cwebp` from Homebrew.

The output goes to `apps/web/public/brand/covers/`:
- `<slug>.png` (1600×900)
- `<slug>.webp` (1600×900, q84, ≤ 95 KB)
- `<slug>-800.webp` (800×450)
- `contact-sheet.png` (the 5 raw covers plus a card mock with a 60% bottom scrim and Inter paper text)

## Credits
All original code. There are no external images or models, so no licence is needed.
