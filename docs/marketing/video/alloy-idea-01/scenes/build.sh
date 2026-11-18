#!/usr/bin/env bash
# ALLOY IDEA 01: render + encode.
#   NODE_MODULES=/path/to/node_modules (must contain playwright-core) ./build.sh
# Outputs (../out):
#   alloy-idea-01-master.mp4   CRF 18 video-only master (large: per-frame grain)
#   alloy-idea-01.mp4          9:16 delivery, <= 50 MB, NO music (silent AAC track, or SFX only if sfx/cues.json exists)
#   alloy-idea-01-music.mp4    same, with the licensed track, if one is dropped into ../audio/ (see README)
#   poster-f0.png poster-f90.png poster-f720.png contact-sheet.png budget.csv words.json
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE/.."
OUT="$ROOT/out"
FF=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
DUR=26
VBITRATE=${VBITRATE:-13M}     # 26 s × (13 + 0.19) Mb/s ≈ 43 MB
mkdir -p "$OUT"
if [ -n "${NODE_MODULES:-}" ]; then ln -sfn "$NODE_MODULES" "$HERE/node_modules"; fi

# 1. frames -> CRF 18 master (video only)
if [ "${SKIP_VIDEO:-0}" != "1" ]; then node "$HERE/render.mjs" --out "$OUT"; mv -f "$OUT/video-only.mp4" "$OUT/alloy-idea-01-master.mp4"; fi
MASTER="$OUT/alloy-idea-01-master.mp4"

# 2. audio beds ------------------------------------------------------------------------------------
# 2a. SFX bed (optional): ../sfx/cues.json = [{"file":"tap.wav","frame":195,"db":-12}, ...] (licensed files only; see DIRECTION §10)
SFX_WAV=""
if [ -f "$ROOT/sfx/cues.json" ]; then
  SFX_WAV="$OUT/sfx-bed.wav"
  python3 - "$ROOT/sfx" "$SFX_WAV" "$FF" "$DUR" <<'PY'
import json, subprocess, sys, os
d, out, ff, dur = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
cues = json.load(open(os.path.join(d, 'cues.json')))
args, fl = [ff, '-y', '-loglevel', 'error', '-f', 'lavfi', '-t', dur, '-i', 'anullsrc=r=48000:cl=stereo'], []
for i, c in enumerate(cues):
    args += ['-i', os.path.join(d, c['file'])]
    ms = round(c['frame'] / 30 * 1000)
    fl.append(f"[{i+1}:a]aresample=48000,aformat=channel_layouts=stereo,volume={c.get('db', -14)}dB,adelay={ms}|{ms}[s{i}]")
mixin = '[0:a]' + ''.join(f'[s{i}]' for i in range(len(cues)))
fl.append(f"{mixin}amix=inputs={len(cues)+1}:normalize=0,atrim=0:{dur}[o]")
subprocess.check_call(args + ['-filter_complex', ';'.join(fl), '-map', '[o]', out])
PY
fi

# 2b. music (optional): ../audio/track.json = {"file":"track.mp3","drop":12.34,"bpm":122}
#     drop = seconds into the ORIGINAL file where the main drop hits; it is placed on f60 (2.000 s).
#     bpm within ±3% of 120 is conformed with atempo (pitch-preserving); otherwise left as is (re-time the grid instead).
MUSIC_WAV=""
for dir in "$ROOT/audio" "$ROOT/music"; do
  if [ -f "$dir/track.json" ]; then
    MUSIC_WAV="$OUT/music-bed.wav"
    python3 - "$dir" "$MUSIC_WAV" "$FF" "$DUR" <<'PY'
import json, subprocess, sys, os
d, out, ff, dur = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
cfg = json.load(open(os.path.join(d, 'track.json')))
src = os.path.join(d, cfg['file']); drop = float(cfg['drop']); bpm = float(cfg.get('bpm', 120))
r = 120.0 / bpm
if abs(r - 1) > 0.03:
    print(f'WARNING: track is {bpm} BPM (>3% from 120): not stretched; re-time the grid per DIRECTION §9'); r = 1.0
inpoint = drop - 2.0 * r                    # 2.000 s of output before the drop
pre = []
if inpoint < 0: pre = [f'adelay={round(-inpoint/r*1000)}|{round(-inpoint/r*1000)}']; inpoint = 0
chain = ([f'atempo={r:.5f}'] if r != 1 else []) + pre + [
    f'atrim=0:{dur}', 'asetpts=PTS-STARTPTS',
    # music break f645–f659: gate to −30 dB (room-tone tail, not a dropout)
    "volume=enable='between(t,21.5,21.9667)':volume=0.0316",
    f'afade=t=out:st={dur-1.2}:d=1.2']
subprocess.check_call([ff, '-y', '-loglevel', 'error', '-ss', f'{inpoint:.4f}', '-i', src, '-af', ','.join(chain), '-ar', '48000', '-ac', '2', out])
print(f'music: in-point {inpoint:.3f}s, tempo x{r:.4f}')
PY
    break
  fi
done

# 2c. mix + master to -14 LUFS / -1 dBTP (two-pass loudnorm, linear)
master_audio() { # $1 = out.wav, rest = input wavs
  local out="$1"; shift
  local ins=() n=0; for f in "$@"; do ins+=(-i "$f"); n=$((n+1)); done
  local pre="amix=inputs=$n:normalize=0"; [ "$n" = 1 ] && pre="anull"
  local js; js=$("$FF" -hide_banner -nostats "${ins[@]}" -filter_complex "$pre,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | python3 -c "import sys,re;t=sys.stdin.read();print(re.findall(r'\{[^{}]*\}',t)[-1])")
  local mi mtp mlra mth off
  read mi mtp mlra mth off < <(python3 -c "import json,sys;j=json.loads(sys.argv[1]);print(j['input_i'],j['input_tp'],j['input_lra'],j['input_thresh'],j['target_offset'])" "$js")
  "$FF" -y -loglevel error "${ins[@]}" -filter_complex "$pre,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true,aresample=48000" -t $DUR "$out"
}

# 3. delivery encodes (2-pass, <= 50 MB) -----------------------------------------------------------
deliver() { # $1 = audio wav or "silent", $2 = output name
  local aud=(-f lavfi -t $DUR -i anullsrc=r=48000:cl=stereo)
  [ "$1" != "silent" ] && aud=(-i "$1")
  ( cd "$OUT" && "$FF" -y -loglevel error -i "$MASTER" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v $VBITRATE -maxrate 18M -bufsize 26M -pass 1 -passlogfile p2 -an -f mp4 /dev/null \
    && "$FF" -y -loglevel error -i "$MASTER" "${aud[@]}" -map 0:v -map 1:a -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v $VBITRATE -maxrate 18M -bufsize 26M -pass 2 -passlogfile p2 \
       -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t $DUR "$2" && rm -f p2-0.log* )
}
if [ -n "$SFX_WAV" ]; then master_audio "$OUT/audio-nomusic.wav" "$SFX_WAV"; deliver "$OUT/audio-nomusic.wav" alloy-idea-01.mp4
else deliver silent alloy-idea-01.mp4; fi
if [ -n "$MUSIC_WAV" ]; then
  if [ -n "$SFX_WAV" ]; then master_audio "$OUT/audio-music.wav" "$MUSIC_WAV" "$SFX_WAV"; else master_audio "$OUT/audio-music.wav" "$MUSIC_WAV"; fi
  deliver "$OUT/audio-music.wav" alloy-idea-01-music.mp4
fi

# 4. posters (lossless, straight from the page), contact sheet, budget ------------------------------
node "$HERE/render.mjs" --out "$OUT/_stills" --stills 0,3,24 >/dev/null
mv -f "$OUT/_stills/still_0.00.png" "$OUT/poster-f0.png"; mv -f "$OUT/_stills/still_3.00.png" "$OUT/poster-f90.png"; mv -f "$OUT/_stills/still_24.00.png" "$OUT/poster-f720.png"; rm -rf "$OUT/_stills"
"$FF" -y -loglevel error -i "$MASTER" -vf "select=not(mod(n\,15)),\
drawbox=x=0:y=1640:w=1080:h=280:color=red@0.25:t=fill,drawbox=x=960:y=0:w=120:h=1640:color=red@0.25:t=fill,\
drawbox=x=0:y=0:w=960:h=140:color=red@0.25:t=fill,drawbox=x=0:y=140:w=60:h=1500:color=red@0.25:t=fill,\
drawbox=x=0:y=420:w=1080:h=1080:color=cyan@0.6:t=3,\
drawtext=text='f%{eif\:n*15\:d}':x=20:y=1700:fontsize=72:fontcolor=yellow,scale=216:384,tile=13x4" -frames:v 1 "$OUT/contact-sheet.png"
"$FF" -loglevel error -i "$MASTER" -vf "select=not(mod(n\,5))" -vsync 0 -f rawvideo -pix_fmt rgb24 - | node "$HERE/budget.mjs" "$OUT/words.json" > "$OUT/budget.csv"
rm -f "$OUT/cues.json"
ls -la "$OUT"
