#!/usr/bin/env bash
# ALLOY SCRIPT C (short cut, 50.0 s): render + encode.
#   NODE_MODULES=/path/with/playwright-core/node_modules ./build.sh      (SKIP_VIDEO=1 reuses the master; SQ=1 also renders 1:1)
# Out (../out): alloy-script-c-master.mp4 (CRF 18), alloy-script-c.mp4 (silent, <= 50 MB),
#   alloy-script-c-<track>.mp4 for every ../audio/*.mp3 (quiet bed, -18 LUFS), posters, contact sheets, budget.csv
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."; OUT="$ROOT/out"; FF=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
DUR=50; VB=${VB:-7M}   # 50 s × (7 + 0.19) Mb/s ≈ 45 MB
mkdir -p "$OUT"; [ -n "${NODE_MODULES:-}" ] && ln -sfn "$NODE_MODULES" "$HERE/node_modules"
if [ "${SKIP_VIDEO:-0}" != "1" ]; then
  node "$HERE/render.mjs" --out "$OUT" > "$OUT/render.log"; mv -f "$OUT/video-only.mp4" "$OUT/alloy-script-c-master.mp4"
  if [ "${SQ:-0}" = "1" ]; then node "$HERE/render.mjs" --out "$OUT" --sq 1 > "$OUT/render-1x1.log"; mv -f "$OUT/video-only-1x1.mp4" "$OUT/alloy-script-c-1x1-master.mp4"; fi
fi
deliver() { # $1 master, $2 audio wav|silent, $3 out
  local aud=(-f lavfi -t $DUR -i anullsrc=r=48000:cl=stereo); [ "$2" != silent ] && aud=(-i "$2")
  ( cd "$OUT" && "$FF" -y -loglevel error -i "$1" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v $VB -maxrate 12M -bufsize 18M -pass 1 -passlogfile p2 -an -f mp4 /dev/null \
    && "$FF" -y -loglevel error -i "$1" "${aud[@]}" -map 0:v -map 1:a -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v $VB -maxrate 12M -bufsize 18M -pass 2 -passlogfile p2 \
       -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t $DUR "$3" && rm -f p2-0.log* )
}
# quiet music bed: starts at the track's first audible sound, 1.5 s fade-in, 3 s fade-out, mastered to -18 LUFS / -2 dBTP
bed() { # $1 mp3, $2 out wav
  local tmp="$OUT/_bed.wav"
  "$FF" -y -loglevel error -i "$1" -af "silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:$DUR,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=$((DUR-3)):d=3" -ar 48000 -ac 2 "$tmp"
  local js; js=$("$FF" -hide_banner -nostats -i "$tmp" -af loudnorm=I=-18:TP=-2:LRA=9:print_format=json -f null - 2>&1 | python3 -c "import sys,re;print(re.findall(r'\{[^{}]*\}',sys.stdin.read())[-1])")
  local a; a=$(python3 -c "import json,sys;j=json.loads(sys.argv[1]);print(f\"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}\")" "$js")
  "$FF" -y -loglevel error -i "$tmp" -af "loudnorm=I=-18:TP=-2:LRA=9:$a:linear=true,aresample=48000" -t $DUR "$2"; rm -f "$tmp"
}
M="$OUT/alloy-script-c-master.mp4"; MSQ="$OUT/alloy-script-c-1x1-master.mp4"
deliver "$M" silent alloy-script-c.mp4
[ -f "$MSQ" ] && deliver "$MSQ" silent alloy-script-c-1x1.mp4
for mp3 in "$ROOT"/audio/*.mp3; do
  n=$(basename "$mp3" .mp3); bed "$mp3" "$OUT/audio-$n.wav"
  deliver "$M" "$OUT/audio-$n.wav" "alloy-script-c-$n.mp4"
  [ -f "$MSQ" ] && deliver "$MSQ" "$OUT/audio-$n.wav" "alloy-script-c-1x1-$n.mp4"
done
# posters + QA
node "$HERE/render.mjs" --out "$OUT/_st" --stills 1.5,10,46 >/dev/null
mv -f "$OUT/_st/still_1.50.png" "$OUT/poster-c1.png"; mv -f "$OUT/_st/still_10.00.png" "$OUT/poster-c3.png"; mv -f "$OUT/_st/still_46.00.png" "$OUT/poster-end.png"; rm -rf "$OUT/_st"
"$FF" -y -loglevel error -i "$M" -vf "select=not(mod(n\,30)),drawbox=x=0:y=1640:w=1080:h=280:color=red@0.25:t=fill,drawbox=x=960:y=0:w=120:h=1640:color=red@0.25:t=fill,drawbox=x=0:y=0:w=960:h=140:color=red@0.25:t=fill,drawbox=x=0:y=140:w=60:h=1500:color=red@0.25:t=fill,drawtext=text='%{eif\:n*1\:d}s':x=20:y=1700:fontsize=72:fontcolor=yellow,scale=216:384,tile=10x5" -frames:v 1 "$OUT/contact-sheet.png"
"$FF" -y -loglevel error -i "$M" -vf "select=not(mod(n\,60)),scale=540:960:flags=area,drawtext=text='%{eif\:n*2\:d}s':x=10:y=10:fontsize=28:fontcolor=yellow,tile=7x4" -frames:v 1 "$OUT/contact-sheet-50pct.png"
"$FF" -loglevel error -i "$M" -vf "select=not(mod(n\,5))" -vsync 0 -f rawvideo -pix_fmt rgb24 - | node "$HERE/budget.mjs" "$OUT/words.json" > "$OUT/budget.csv"
rm -f "$OUT/cues.json"; ls -la "$OUT"
