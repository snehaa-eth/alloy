# Alloy · style test 3D (10 s, 9:16)

A style test for one script beat ("Priya wants to invest in AI. / But which stocks? She has no idea."), made in the
**Certificate + Alloy bars** language: 3D objects drawn as banknote-style line engraving.

- `style-test-3d.mp4`: 1080×1920, 30 fps, H.264 yuv420p CRF 18. The music bed is Pixabay "minimal electronica" (Pixabay licence), loudness-normalised to about -18 LUFS, with a 0.6 s fade in and a 1.6 s fade out.
- `stills/`: three poster frames (chip at 3.0 s, alloy-bar sweep at 4.27 s, end frame at 9.9 s).
- `index.html` + `scene.js`: the scene (Three.js r170 in `vendor/`, fonts in `fonts/`).
- `render.mjs`: deterministic renderer. It loads the page in headless Chrome, calls `window.renderFrame(t)` for each frame, screenshots the stage and encodes with ffmpeg.

## How the look is made
- **Engraving shader** (`FRAG` in scene.js). Each part carries its own line family in rest/object space, so the lines stick to the surface:
  - concentric squares on the package and pins,
  - a 15-lobe crossing-wave rosette on the die,
  - horizontal contour lines on the sides.
- **Line width follows lighting**: a point key light with falloff, a fill light, a studio reflection band and a specular highlight. Highlights add a crossing hatch family.
- **Lines are anti-aliased** analytically with `fwidth`. When lines get too dense to resolve, they fall back to their average tone, so there is no moiré.
- **Supersampling and keylines**: everything is rendered at 2× (2160×3840) and resolved to 1080×1920. A Sobel pass on a normal buffer adds hairline keylines.
- **Assembly**: every engraved line draws in at its own moment, with a hot tip on the leading point. The pins slide in, the die drops, then a champagne sheen passes across the chip at 2.55–3.65 s.
- **Transition**: an alloy bar. Five jewel-tone polished-metal bands (thickness = AI Build-Out weights 35/25/20/12/8) sweep in alternate directions with 8-sample motion blur. The bands are drawn on their own top WebGL layer so they cover the type. The chip is swapped for engraved flakes underneath the bands.
- **Tickers**: canvas-text textures filled with engraved stripes, in three depth tiers. The basket's five names are in paper; the noise is in sapphire. The layout is non-overlapping and keeps clear of the text band, and the drift decelerates to a calm end.
- **Frame**: a double hairline certificate border with corner rings, the serial `No. 0001 · ALLOY`, a 2 px #C41A42 signature rule, and mono footers.

## Re-render
```
npm i playwright-core three@0.170.0     # anywhere; point PW_FROM at its package.json
PW_FROM=/path/package.json WORK=/tmp/frames node render.mjs          # full video
PW_FROM=/path/package.json node render.mjs --stills 1.2,3,4.27      # QA stills
```
Rendering takes about 70 s on an M4 (Metal ANGLE).
