#!/bin/sh
# usage: scripts/sheet.sh <dir-of-pngs> <out.png> [cols] [width]
DIR=$1; OUT=$2; COLS=${3:-6}; WD=${4:-360}
N=$(ls "$DIR"/*.png | wc -l | tr -d ' ')
ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -v error -y -pattern_type glob -i "$DIR/*.png" -vf "scale=$WD:-1,tile=${COLS}x${ROWS}:padding=6:color=0x333333" -frames:v 1 "$OUT"
