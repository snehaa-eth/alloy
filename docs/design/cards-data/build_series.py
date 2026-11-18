#!/usr/bin/env python3
"""Turn feeds.json (real Chainlink daily closes) into weighted index series for each seed basket.

Index = buy-and-hold from the first common day: sum_i w_i * p_i,t / p_i,0 * 100, with the recipe
weights below. Missing days for a stock (feed had no update that UTC day) are forward-filled.
Writes baskets.json. Stdlib only. Run: python3 -I build_series.py
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
feeds = json.load(open(os.path.join(HERE, "feeds.json")))["feeds"]

BASKETS = [  # name, jewel tone, recipe (weights sum to 100). Only stocks with a Base mainnet feed.
    ("The AI Build-Out", "sapp", {"NVDA": 35, "MSFT": 25, "GOOGL": 20, "AMZN": 12, "META": 8}),
    ("Big Tech, Trimmed", "emer", {"AAPL": 20, "MSFT": 20, "GOOGL": 20, "AMZN": 20, "META": 20}),
    ("Capitol Tech", "burg", {"MSFT": 30, "NVDA": 30, "AAPL": 20, "GOOGL": 20}),
    ("Picks & Shovels", "amb", {"NVDA": 40, "AMZN": 30, "MSFT": 30}),
    ("Conviction Bets", "plum", {"MSTR": 40, "TSLA": 40, "NVDA": 20}),
]

out = {"method": "buy-and-hold weighted index from real Chainlink daily closes, first common day = 100", "baskets": []}
for name, tone, recipe in BASKETS:
    missing = [s for s in recipe if "series" not in feeds.get(s, {}) or not feeds[s]["series"]]
    if missing:
        out["baskets"].append({"name": name, "tone": tone, "recipe": recipe, "error": f"no real data for {missing}; not drawn"})
        continue
    per = {s: dict(feeds[s]["series"]) for s in recipe}
    start = max(min(per[s]) for s in recipe)               # first day every stock has a price
    days = sorted({d for s in recipe for d in per[s] if d >= start})
    last, series = {}, []
    for d in days:
        for s in recipe:
            if d in per[s]: last[s] = per[s][d]
        if len(last) < len(recipe): continue
        if not series: base = dict(last)
        series.append([d, round(sum(w * last[s] / base[s] for s, w in recipe.items()), 3)])
    ch = series[-1][1] / series[0][1] - 1
    peak, mdd = 0, 0
    for _, v in series:
        peak = max(peak, v); mdd = min(mdd, v / peak - 1)
    out["baskets"].append({"name": name, "tone": tone, "recipe": recipe, "from": series[0][0], "to": series[-1][0],
                           "change": round(ch * 100, 2), "max_drawdown": round(mdd * 100, 2), "series": series})
    print(f"{name:20s} {series[0][0]} → {series[-1][0]}  {len(series):3d} pts  {ch*100:+.2f}%  maxDD {mdd*100:.2f}%")
json.dump(out, open(os.path.join(HERE, "baskets.json"), "w"), indent=1)
