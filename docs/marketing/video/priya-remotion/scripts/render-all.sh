#!/bin/sh
# Renders every deliverable into out/. ~2 min on an M-series Mac.
set -e
cd "$(dirname "$0")/.."
A="--codec=h264 --crf=16 --audio-codec=aac --audio-bitrate=256k"
npx remotion render Priya9x16 out/priya-9x16.mp4 $A --props='{"music":"electronica"}'
npx remotion render Priya1x1 out/priya-1x1.mp4 $A --props='{"music":"electronica"}'
# music variants: render the mix only, then mux it onto the same picture
for m in elegant refined; do
  npx remotion render Priya9x16 out/.audio-$m.wav --codec=wav --props="{\"music\":\"$m\"}"
  for a in 9x16 1x1; do
    ffmpeg -v error -y -i out/priya-$a.mp4 -i out/.audio-$m.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest out/priya-$a-$m.mp4
  done
  rm out/.audio-$m.wav
done
mkdir -p out/posters
for t in 2.6 10.5 14.8 21.5 25.5 32.5 45; do ffmpeg -v error -y -ss $t -i out/priya-9x16.mp4 -frames:v 1 out/posters/poster-9x16-${t}s.png; done
ffmpeg -v error -y -ss 45 -i out/priya-1x1.mp4 -frames:v 1 out/posters/poster-1x1-end.png
ffmpeg -v error -y -i out/priya-9x16.mp4 -vf "fps=1,scale=216:-1,drawtext=text='%{eif\:t\:d}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=10x5:padding=4" -frames:v 1 out/contact-sheet-9x16.png
ffmpeg -v error -y -i out/priya-1x1.mp4 -vf "fps=1,scale=216:-1,drawtext=text='%{eif\:t\:d}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=10x5:padding=4" -frames:v 1 out/contact-sheet-1x1.png
for f in out/priya-*.mp4; do echo "$f $(ffmpeg -hide_banner -nostats -i $f -af ebur128 -f null - 2>&1 | grep -E '^ +I:' | tr -s ' ')"; done
