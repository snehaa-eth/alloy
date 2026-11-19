# Alloy · "Priya, $5 and one idea" (Concept C short cut, 50.0 s) — Remotion

The locked script is in `docs/marketing/script/SCRIPTS.md` (C short cut). Every hold is exact: 30 fps, 1500 frames, with the cuts at
3.5 / 7.5 / 8.5 / 12.5 / 16.5 / 23.5 / 26.5 / 30.5 / 34.5 / 37.5 / 41.0 s (`src/timeline.ts`).

## Preview
```
npm i
npx remotion studio          # compositions: Priya/Priya9x16, Priya/Priya1x1 (prop `music`: electronica | elegant | refined)
```

## Render
```
scripts/render-all.sh        # every file in out/ (~75 s on an M-series Mac)
npx remotion render Priya9x16 out/priya-9x16.mp4 --props='{"music":"electronica"}'   # one file
npx remotion render Priya9x16 out/stills --frames=60,440,990 --image-format=png --muted  # QA stills
```
WebGL uses the ANGLE renderer (set in `remotion.config.ts`).

## Output (`out/`)
- `priya-9x16.mp4` and `priya-1x1.mp4`: master, with the Pixabay "Minimal Electronica" bed.
- `priya-*-elegant.mp4` and `priya-*-refined.mp4`: the same picture with the other two Pixabay beds.
- `posters/`: 7 lossless 9:16 frames and one 1:1 end card.
- `contact-sheet-9x16.png` and `contact-sheet-1x1.png`: one frame per second.

## How it's built
- **Readability.** Each card arrives in 0.4 s or less (a quick decode), then holds still for its whole hold. It exits only after its hold ends. Type is Inter 600 at 88 px (9:16) or 76 px (1:1), left-aligned at the same point in every scene. Motion stays in the visual zone above the text.
- **Engraved 3D** (`src/three/engrave.ts`). This ports the style-test shader to `@remotion/three`. Line width follows the light, highlights get a cross-hatch, the lines draw on with a hot tip, and a sheen passes across. Lighting is in world space and keylines come from screen-space derivatives. The canvas is rendered at 2× and composited with `screen`, so only the lines add light.
  - C1: the chip assembles while the camera pushes in. A dim plate of the real AI Build-Out cover sits behind it.
  - C4, C8, C9: five alloy ingots, length = weight. NVDA grows past a dotted target line, then eases back while the extra sliver peels off as flakes.
- **Metal transitions** (`AlloySweep`). Five jewel bands (thickness = the recipe weights) sweep across with a 180° shutter blur. A sweep starts exactly on a cut, so no hold is shortened. Softer turns use a light sheen instead.
- **App screens** follow the warmer v5 direction: rounded cards, the real cover image, stock marks, an initial avatar, and the alloy bar.
  - The stock marks are simplified brand-colour monograms, not official logos.
- **The frame motif** is reduced to one gradient hairline and a small `No. 0001`.
- **Sound**
  - The music is time-stretched to exactly 120 BPM (ffmpeg `atempo`, pitch kept). That puts every locked cut on a beat, with a downbeat at 0.5 s. Sources are in `music-src/`.
  - The beds are about −18 LUFS integrated. The music dips about 3 dB under the big hits.
  - The SFX kit is synthesised and deterministic (`scripts/make-sfx.mjs`): decode ticks, whoosh, soft impact, sheen, click, hold, check, flip, slide and flake. Each cue starts 1–3 frames before its visual.
- **Compliance.** The only gold is the check ring and the creator ring. Burgundy is limited to the trim icon and a light tint. The chart has no numbers and carries "Example basket. Past results aren't a promise." The end card has all three lines.

## Licences
- Music: Pixabay Content Licence. Credit if you like: Minimal Electronica (Kulakovka), Elegant Minimal (penguinmusic; Content ID registered), Refined Motion (u_98673jp944).
- Fonts: Inter, Anton and JetBrains Mono (OFL).
- Remotion: free for teams of up to 3. Check the licence before company use.
