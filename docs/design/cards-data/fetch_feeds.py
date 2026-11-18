#!/usr/bin/env python3
"""Fetch real daily price history for Alloy seed baskets from Chainlink feeds on Base mainnet.

Reads every round of the current phase via getRoundData(uint80) (JSON-RPC batch eth_call against
https://mainnet.base.org), keeps the last round of each UTC day, and writes feeds.json.
Feeds report price x uiMultiplier per raw token, 8 decimals (ARCHITECTURE.md §1).
No API key needed. Stdlib only. Run: python3 -I fetch_feeds.py  (from this folder)
"""
import json, urllib.request, time, datetime, os, sys
RPC = "https://mainnet.base.org"
FEEDS = {
    "AAPL": "0x787f13dEa48Db0897CbCDD985de77809D837F988",
    "AMZN": "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295",
    "GOOGL": "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2",
    "META": "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D",
    "MSFT": "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c",
    "MSTR": "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a",
    "NVDA": "0x04689a41629776563E6822F76f2e57D148d28513",
    "TSLA": "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4",
}
DAYS = int(os.environ.get("DAYS", "90"))

def rpc(payload):
    req = urllib.request.Request(RPC, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "User-Agent": "alloy-design-script"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            time.sleep(1.5 * (attempt + 1)); err = e
    raise err

def call(addr, data, i=1):
    return {"jsonrpc": "2.0", "id": i, "method": "eth_call", "params": [{"to": addr, "data": data}, "latest"]}

def dec_round(hexs):
    b = bytes.fromhex(hexs[2:])
    if len(b) < 160: return None
    w = [int.from_bytes(b[i*32:(i+1)*32], "big") for i in range(5)]
    ans = w[1] - (1 << 256) if w[1] >= 1 << 255 else w[1]
    return {"roundId": w[0], "answer": ans, "updatedAt": w[3]}

def history(sym, addr):
    latest = dec_round(rpc(call(addr, "0xfeaf968c"))["result"])
    phase = latest["roundId"] >> 64
    agg = latest["roundId"] & ((1 << 64) - 1)
    cutoff = latest["updatedAt"] - DAYS * 86400
    # Public RPC allows 25 req/s, so read every STRIDE-th round (feeds update ~10-20x per trading day),
    # in batches of 20 per second, retrying rate-limited calls. Daily close = last sampled round of the day.
    STRIDE = int(os.environ.get("STRIDE", "4"))
    rounds, rid, done = [], agg, False
    while rid >= 1 and not done:
        ids = [x for x in range(rid, max(0, rid - 20 * STRIDE), -STRIDE)]
        pending = ids
        got = {}
        for attempt in range(6):
            if not pending: break
            res = rpc([call(addr, "0x9a6fc8f5" + ((phase << 64) | x).to_bytes(32, "big").hex(), x) for x in pending])
            res = res if isinstance(res, list) else [res]
            retry = []
            for r in res:
                if "error" in r and "limit" in str(r["error"]).lower(): retry.append(r["id"]); continue
                got[r["id"]] = r.get("result")
            pending = retry
            time.sleep(1.05)
        for x in sorted(got, reverse=True):
            res = got[x]
            d = dec_round(res) if res and res != "0x" else None
            if not d or d["updatedAt"] == 0: done = True; break
            rounds.append(d)
            if d["updatedAt"] < cutoff: done = True; break
        rid -= 20 * STRIDE
    daily = {}
    for d in sorted(rounds, key=lambda d: d["updatedAt"]):
        day = datetime.datetime.fromtimestamp(d["updatedAt"], datetime.UTC).strftime("%Y-%m-%d")
        daily[day] = d["answer"] / 1e8          # last update of each UTC day
    days = sorted(k for k in daily if k >= datetime.datetime.fromtimestamp(cutoff, datetime.UTC).strftime("%Y-%m-%d"))
    return {"feed": addr, "phase": phase, "rounds_read": len(rounds), "latest": latest["answer"] / 1e8,
            "latest_at": latest["updatedAt"], "series": [[k, round(daily[k], 4)] for k in days]}

out = {"source": "Chainlink feeds on Base mainnet via getRoundData (" + RPC + ")", "generated": datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds"),
       "note": "Daily close = last on-chain update of each UTC day. Values are price x uiMultiplier per raw token (8 dec).", "feeds": {}}
for sym, addr in FEEDS.items():
    try:
        out["feeds"][sym] = history(sym, addr); print(sym, "ok", len(out["feeds"][sym]["series"]), "days", out["feeds"][sym]["rounds_read"], "rounds", file=sys.stderr)
    except Exception as e:
        out["feeds"][sym] = {"feed": addr, "error": str(e)}; print(sym, "FAILED", e, file=sys.stderr)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "feeds.json"), "w"), indent=1)
