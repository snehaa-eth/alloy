#!/usr/bin/env bash
# Renders the procedural Alloy basket covers with headless Chrome, then encodes WebP.
# Usage: bash docs/design/covers-src/render.sh [slug ...]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../../apps/web/public/brand/covers"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"
SLUGS=("$@"); [ ${#SLUGS[@]} -eq 0 ] && SLUGS=(capitol-tech big-tech picks-shovels space-race ai-build-out)
TMPPROFILE="$(mktemp -d)"
for s in "${SLUGS[@]}"; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$TMPPROFILE" --allow-file-access-from-files \
    --window-size=1600,900 --virtual-time-budget=8000 \
    --screenshot="$OUT/$s.png" "file://$HERE/covers.html#$s" >/dev/null 2>&1
  cwebp -quiet -q 84 -m 6 -sharp_yuv "$OUT/$s.png" -o "$OUT/$s.webp"
  cwebp -quiet -q 84 -m 6 -sharp_yuv -resize 800 450 "$OUT/$s.png" -o "$OUT/$s-800.webp"
  echo "$s: $(stat -f%z "$OUT/$s.png") B png, $(stat -f%z "$OUT/$s.webp") B webp, $(stat -f%z "$OUT/$s-800.webp") B webp-800"
done
if [ -f "$HERE/contact-sheet.html" ] && [ ${#SLUGS[@]} -eq 5 ]; then
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$TMPPROFILE" --allow-file-access-from-files \
    --window-size=2090,690 --virtual-time-budget=10000 \
    --screenshot="$OUT/contact-sheet.png" "file://$HERE/contact-sheet.html" >/dev/null 2>&1
  echo "contact-sheet.png written"
fi
rm -rf "$TMPPROFILE"
