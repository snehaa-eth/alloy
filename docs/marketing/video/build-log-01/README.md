# BUILD LOG 01: "A stock with no code"

A 32-second vertical video (1080×1920, 30 fps) for @alloy_fi. It is faceless and all type, with original synthesized sound. The creative brief is `DIRECTION.md`, owned by the Director; this README covers production.

- **Final file:** `out/build-log-01.mp4`
- **Posters:** `out/poster-f0.png` (the hook frame, also X's default first frame) and `out/poster-f60.png` (adds `ONE BYTE.`). `poster.png` is a copy of whichever one the Director picks.
- **QA:** `out/contact-sheet.png` shows every 20th frame with the unsafe areas tinted red. `out/budget.csv` gives burgundy %, gold % and bright pixels in unsafe areas for every 5th frame.

## Re-render

Requirements:
- Google Chrome in `/Applications`
- Node 18+
- `/opt/homebrew/bin/ffmpeg`
- a `node_modules` folder that contains `playwright-core`

```bash
mkdir -p /tmp/bl01 && cd /tmp/bl01 && npm i playwright-core@1.48.2
NODE_MODULES=/tmp/bl01/node_modules ./scenes/build.sh      # ~2.5 min on an M-series Mac
```

How the build works:
- `scenes/index.html` holds every shot. It exposes `renderAt(t)`, which draws frame `round(t*30)` synchronously.
  - Every random value comes from a seeded PRNG, and nothing reads the clock, so frames are deterministic.
  - Fonts are local (`scenes/fonts/`: Anton, Inter, JetBrains Mono, from Google Fonts, all under the OFL).
- `scenes/render.mjs` drives headless Chrome through Playwright. It screenshots frames 0–959 and pipes them into ffmpeg (H.264 High, yuv420p, CRF 18).
- `scenes/audio.mjs` synthesizes the score sample by sample from the cue sheet in DIRECTION.md §9:
  - instruments: kick, boom, sub, tick, hat, fail buzz, glitch, riser, FM bell, hit, whoosh;
  - no samples and no music.
  - `build.sh` runs it three times to land at −14 LUFS. A true-peak-aware limiter holds the master under −1 dBTP.
  - f310–f319 is exact digital zero.
- `scenes/budget.mjs` runs the colour-budget and safe-area audit on raw frames.
- `build.sh` muxes the video with AAC 192k at 48 kHz using `+faststart`.

## Compressing the final mp4 below 50 MB

The CRF 18 master is about 183 MB. The 4% grain is regenerated on every frame, and noise like that barely compresses, so the master averages about 45 Mb/s. Constrain the bitrate with a 2-pass encode: at ~11 Mb/s video plus 192k audio over 32 s, the file comes out around 45 MB. `build.sh` now does this automatically. It writes `out/build-log-01-master.mp4` (CRF 18) and `out/build-log-01.mp4` (2-pass, for X). To redo it by hand from the master:

```bash
cd out
ffmpeg -y -i build-log-01-master.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow \
  -b:v 11M -maxrate 16M -bufsize 22M -pass 1 -an -f mp4 /dev/null
ffmpeg -y -i build-log-01-master.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow \
  -b:v 11M -maxrate 16M -bufsize 22M -pass 2 -c:a aac -b:a 192k -ar 48000 -movflags +faststart build-log-01.mp4
rm -f ffmpeg2pass-0.log*
```

- To size for a different cap, set `-b:v ≈ (target_MB × 8 / 32 s) − 0.2` Mb/s.
- If the grain turns blocky at that rate, two levers help, each roughly halving the size:
  - drop the grain to 2% (the `0.04` in `grain()` in `scenes/index.html`), or
  - render the grain at half resolution.

## Truth audit: every on-screen value and its capture

| On screen | Source |
|---|---|
| `$ cast code 0xb200…108C` → `0xef` | `captures/01-cast-code-nvdac.txt` (Base mainnet, NVDAc `0xb20000000000000000000078ee7ce2fE4908108C`) |
| `"NVDAc"`, `"NVIDIA Corporation"` | `captures/01-cast-code-nvdac.txt` |
| `[FAIL: EvmError: Revert] …` lines, `0 passed · 9 failed` | `captures/02-forge-fail.txt`: stock forge 1.1.0 gives "0 tests passed, 9 failed, 1 skipped (10 total tests)" |
| 16 `[PASS] …` lines, `108 passed`, `0 failed.` | `captures/03-base-forge-pass.txt`: base-forge 1.6.0-v1.1.0 gives "108 tests passed, 0 failed, 1 skipped (109 total tests)" |
| `ALLOY DEMO: BIG TECH`, `aDEMO`, the `name()` call | `captures/04-live-basket-sepolia.txt` (basket `0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c`, Base Sepolia) |
| chips `tGOOGLc`, `tMSFTc`, `tTSLAc`, and the `0xef` tag | `captures/05-getbundle.txt`: `getBundle()` returns exactly these 3, and `cast code` on each returns `0xef` |

Both test runs used the committed contracts at `0887d92`, in a throwaway worktree with the same `lib/`.

Copy that changed because of the honesty gates:
- **S4:** stock forge reports **9 failed / 0 passed**. Each suite's `setUp()` reverts on the first B20 precompile call, so forge counts one failure per suite (8 `setUp()` failures plus the smoke test).
  - The screen says `0 passed · 9 failed`, which is literal.
  - The jump from "9 failed" to "108 passed" is real: once setUp works, the individual tests inside each suite run.
- **S8:** the live basket holds **3** testnet tokens (tGOOGLc, tMSFTc, tTSLAc), not 6, and it holds no NVDA.
  - The `0xef` tag sits on tGOOGLc, which also returns `0xef` (captured).
- **NAV is not shown.** `nav()` = 13490128363, which is USD with 8 decimals (≈ $134.90 on testnet prices). It is verifiable, but the brief says no $ figures.
- **S10:** the founder decided on no mascot, so the glyph-bust tease is cut.
  - B10 (f720–f799) is now a terminal beat: "Every stock in this basket." followed by `cast code` on each of the 3 components, each returning `0xef`.
  - This is real, from `captures/05-getbundle.txt`, with cuts on f720/f740/f760 and outputs on the 8ths.
  - The f800 glyph explosion is gone, so `STORIES,` hard-cuts in on the downbeat.
- **S12:** to stay at 7 or fewer display words, `Alloy · build log 01` cuts out at f880 when `Testnet link in replies.` comes in.
- The old v1 basket `0x6605…Cd6f` is captured for the record only (`captures/04-old-v1-basket-0x6605-NOT-FEATURED.txt`). It is not featured.

## X post

**Caption**

> BUILD LOG 01. B20 stock tokens on Base are precompiles. eth_getCode returns 0xef. Stock Foundry can't run them, so every basket test failed (0 passed, 9 failed). Fix + what I learned ↓ #StocksMaxxing

**Thread**

1. A precompile is logic built into the chain's node rather than deployed as bytecode. So `cast code` on NVDAc returns a single marker byte: 0xef. Stock Foundry's EVM doesn't know these addresses, so every test's setUp reverted.
2. Fix: `base-foundryup` installs Base's own Foundry build (base-forge, base-anvil, base-cast), which has the B20 precompiles built in. Same contracts, same tests: 108 passed, 0 failed.
3. Alloy is a basket token that holds these stocks. A demo basket is live on Base Sepolia now, holding tGOOGLc, tMSFTc and tTSLAc: sepolia.basescan.org/address/0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c Public testnet this week.

**First reply / disclaimer (from DIRECTION §11):**

> Tokenized stock exposure, not shares. Not available to US persons. Built on Base, not by Base.

## Compliance note

- Coinbase's tokenized stocks (B20 on Base) are mentioned descriptively, as the technical subject of the post. No partnership, sponsorship or endorsement by Coinbase or Base is stated or implied.
  - "Base's own Foundry" describes who publishes base-forge. It is not a claim of affiliation.
- No company, Base or Coinbase logos appear. Tickers are plain text.
- No prices, returns or calls to invest appear. "Testnet" is on screen whenever the Sepolia basket is shown.
- All audio is original synthesis, with no third-party music or samples.
