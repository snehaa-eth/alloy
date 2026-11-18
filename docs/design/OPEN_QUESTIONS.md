# Open questions for the founder

Each question comes with a recommendation, so a "yes, go" is enough. Ordered by how much they block design work.

---

### 1. Is follower-vs-creator PnL the hero of the basket page?
- **Options:**
  - (a) Hero card right under the chart.
  - (b) A tab.
  - (c) A small stat.
- **Recommendation: (a).** It's the one thing no competitor shows side by side, and it's the hook of the demo ("copy-traders lose while leaders win"). It does mean we must publish uncomfortable gaps too.
- **Needs from you:** confirm we'll show the gap honestly even on our own seed baskets. The copy for a gap over 5% is in COPY §5.

### 2. ~~Dark mode default, or light?~~ **Decided 2026-11-19**
- **Dark is the default; light is an option.**
- Palette v0.2:
  - bg #0A0A0A, text #F2F0ED,
  - off-white primary buttons,
  - burgundy at most 10% of any screen,
  - accent #C41A42,
  - jade gain,
  - no pink.
- Applied in TOKENS.md, wireframes and the prototype.
- **Still open:** the founder suggested #B5123A for small accents. It measures 2.93:1 on #0A0A0A, which fails 3:1, so I used #C41A42 (3.37:1). Confirm or pick another shade that passes.

### 3. Default sort on Explore
- **Options:**
  - (a) Best for followers (1M).
  - (b) Most followed.
  - (c) Biggest (AUM).
  - (d) Newest.
- **Recommendation:** (b) "Most followed" for the hackathon, since with 2–5 baskets returns are noise. Switch to (a) once there are 20+ baskets with 30+ days of history.
- **Never:** creator return or APR as the default.

### 4. Fee: fixed 1% or creator-chosen (0–2%)?
- The contract allows up to 2%, immutable per basket.
- **Recommendation:** fixed 1% in v2 UI, with a "custom fee" toggle hidden behind "Advanced" later. One number is easier to explain ("1% a year, you keep 80%"), and fee competition is a later problem.

### 5. Rename "AI Leaders"?
- Bitwise already ships an "AI Leaders" ATP on the same Coinbase tokens on Base.
- **Recommendation:** rename the seed basket to **"The AI Build-Out"** (or "Picks & Shovels"). This avoids confusion and any whiff of copying a regulated issuer's product name.

### 6. How do users get USDC?
- **Options:**
  - (a) On-ramp widget (Coinbase Onramp, MoonPay, Transak; check India/Nigeria/Brazil coverage).
  - (b) "Send from another app" only.
  - (c) Both.
- **Recommendation:** (c) for launch, with "Send from another app" fully built. The on-ramp can be a link-out for the hackathon.
- **Needs from you:** which markets matter first (India alone changes the on-ramp list a lot).

### 7. Local currency display
- **Recommendation:** show "≈ ₹28,740" in grey under USD totals, off by default, turned on from a currency picker at first launch based on locale. Never price in local currency.
- **Needs from you:** OK to depend on an FX price API for display?

### 8. Hold-to-confirm or tap-to-confirm?
- **Recommendation:** hold to confirm (~600ms) on Buy, Sell and Withdraw. Tap on everything else. It replaces a second review screen and prevents pocket-trades.
- **Risk:** some users don't discover hold gestures. Mitigate with "Hold" in the button label, plus a tooltip on the first release-too-early.

### 9. Notifications channel
- **Options:**
  - (a) In-app only.
  - (b) Email.
  - (c) Web push.
  - (d) Telegram bot.
- **Recommendation:** (a) + (b) for the hackathon. A **Telegram bot** next. It's where crypto users in our regions already live, and the keeper alerting stack already uses Telegram.
- **Never:** nudges to trade (COPY §16).

### 10. Creator minimum stake?
- Dub requires creators to invest at least $1k. Hyperliquid leaders keep at least 5% *(verify)*.
- The contract only enforces a $10 seed.
- **Recommendation:**
  - No hard minimum for v2.
  - Show the stake prominently.
  - Badge baskets where the creator holds 5% or more as "Creator invested".
  - Flag creator sales to followers.

### 11. Show "Max rebalance size" and the TVL cap?
- **Recommendation:** "Max rebalance today" goes in Details (power users). The $5k hackathon cap shows as a progress bar on the card only when over 50% full ("$3,100 of $5,000 filled"). The pump.fun graduation bar, minus the casino.

### 12. Type pairing
- **A (recommended):** Anton + Inter. Poster energy with calm UI.
- **B:** Big Shoulders Display + Geist. More crypto-native and futuristic.
- **Needs from you:** a gut pick. Both are free Google Fonts and the wireframes use A.

### 13. ~~Illustration and art direction~~ **Decided 2026-11-19: mascot dropped**
- **No Caesar bust or statue-in-VR anywhere.** The founder's reasons: it's an AI-art cliché, it means nothing to target users, and premium finance brands don't use mascots.
- The brand rests on:
  - Anton typography,
  - **jewel-tone basket covers** (the main imagery),
  - real product moments (numbers, rebalance visuals, share cards),
  - burgundy silk and white smoke as background textures only,
  - faceless type-plus-screen videos.
- Avatar: the Alloy wordmark/mark.
- Updated: wireframes-v2, IMAGERY, TOKENS, MOTION, the motion prototype, COPY and the marketing docs. wireframes.html (v1) is kept as a historical draft and still shows the old bust slot.

### 14. Should the word "wallet" appear anywhere?
- **Recommendation:** only in Me > "Your wallet address (Base)" and on the "Send from another app" screen. Everywhere else, say "account".

### 15. Story baskets about politicians: how far do we go?
- The ARCH rules require the disclosure date and "not affiliated".
- **Recommendation:**
  - Name the disclosure source, not the person, in the basket name ("Capitol Tech", not "Pelosi Portfolio").
  - Put the person's name only in the thesis with the date.
  - This lowers likeness and defamation risk and still tells the story.
