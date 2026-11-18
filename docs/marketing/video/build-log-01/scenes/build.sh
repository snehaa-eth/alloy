#!/usr/bin/env bash
# Re-render BUILD LOG 01 end to end.
#   NODE_MODULES=/path/to/node_modules (must contain playwright-core) ./build.sh
# Output: ../out/{build-log-01.mp4, poster-f0.png, poster-f60.png, contact-sheet.png, budget.csv, audio.wav}
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../out"
FF=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
mkdir -p "$OUT"
if [ -n "${NODE_MODULES:-}" ]; then ln -sfn "$NODE_MODULES" "$HERE/node_modules"; fi

# 1. frames -> video-only.mp4 (deterministic: frame n is rendered at t = n/30)
if [ "${SKIP_VIDEO:-0}" != "1" ]; then node "$HERE/render.mjs" --out "$OUT"; fi

# 2. audio: synthesise, measure integrated loudness, re-synthesise at the gain that lands -14 LUFS
measure() { "$FF" -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/ I:/{print $2; exit}'; }
G=1.0
for pass in 1 2 3; do
  node "$HERE/audio.mjs" "$OUT/audio.wav" "$G" >/dev/null
  I=$(measure "$OUT/audio.wav")
  G=$(python3 -c "import math;print($G*10**((-14.0-($I))/20))")
  echo "audio pass $pass: I=$I LUFS -> next gain $G"
done
node "$HERE/audio.mjs" "$OUT/audio.wav" "$G"
"$FF" -hide_banner -nostats -i "$OUT/audio.wav" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2

# 3. mux
"$FF" -y -loglevel error -i "$OUT/video-only.mp4" -i "$OUT/audio.wav" -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT/build-log-01-master.mp4"
# delivery cut for X: 2-pass ~11 Mb/s H.264 High so the file stays < 50 MB (the per-frame grain makes CRF files huge)
( cd "$OUT" && "$FF" -y -loglevel error -i video-only.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 11M -maxrate 16M -bufsize 22M -pass 1 -an -f mp4 /dev/null \
  && "$FF" -y -loglevel error -i video-only.mp4 -i audio.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 11M -maxrate 16M -bufsize 22M -pass 2 \
     -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest build-log-01.mp4 && rm -f ffmpeg2pass-0.log* )

# 4. posters, contact sheet (every 20th frame, unsafe areas tinted), budget csv
"$FF" -y -loglevel error -i "$OUT/video-only.mp4" -vf "select=eq(n\,0)" -frames:v 1 "$OUT/poster-f0.png"
"$FF" -y -loglevel error -i "$OUT/video-only.mp4" -vf "select=eq(n\,60)" -frames:v 1 "$OUT/poster-f60.png"
"$FF" -y -loglevel error -i "$OUT/video-only.mp4" -vf "select=not(mod(n\,20)),\
drawbox=x=0:y=1640:w=1080:h=280:color=red@0.25:t=fill,drawbox=x=960:y=0:w=120:h=1640:color=red@0.25:t=fill,\
drawbox=x=0:y=0:w=960:h=140:color=red@0.25:t=fill,drawbox=x=0:y=140:w=60:h=1500:color=red@0.25:t=fill,\
drawtext=text='f%{eif\:n*20\:d}':x=20:y=1700:fontsize=64:fontcolor=yellow,scale=270:480,tile=8x6" -frames:v 1 "$OUT/contact-sheet.png"
"$FF" -loglevel error -i "$OUT/video-only.mp4" -vf "select=not(mod(n\,5))" -vsync 0 -f rawvideo -pix_fmt rgb24 - | node "$HERE/budget.mjs" > "$OUT/budget.csv"
echo "done: $OUT/build-log-01.mp4"
