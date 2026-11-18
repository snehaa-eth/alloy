#!/usr/bin/env bash
# Writes JSON ABIs for the sdk into abi/. Usage: ./script/export-abi.sh   (needs base-forge + jq)
set -euo pipefail
cd "$(dirname "$0")/.."
BF="${BASE_FORGE:-$HOME/.foundry/bin/base-forge}"
"$BF" build --skip test --skip script >/dev/null
mkdir -p abi
for c in BasketFactory Basket AlloyRouter UniswapV3Adapter AerodromeAdapter SimpleFeedGuard ChainlinkFeedGuard \
  IBasket IBasketFactory ISwapAdapter IFeedGuard IFeedPauseRegistry IAggregatorV3; do
  f=$(find out -path "*/${c}.sol/${c}.json" | head -1)
  [ -n "$f" ] || { echo "missing artifact for $c" >&2; exit 1; }
  jq '.abi' "$f" > "abi/${c}.json"
done
echo "wrote $(ls abi | wc -l | tr -d ' ') ABIs to abi/"
