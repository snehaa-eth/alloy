# UX map review (independent)

2026-11-19 · `UX_MAP.md` + `ux-map.html` vs ARCHITECTURE, contracts, COPY, X_PLAN.

**Short version.** Thorough, and the key calls are right (browse first, Exit sheet, do nothing = stay in, Activity, tap to confirm). But it is drawn for a mainnet product; Dec 4 is a **testnet launch driven by X**. Four mechanics are wrong or missing, the traction funnel is thin, and ~40% can wait.

---

## 1. Heuristic findings

| # | Sev | Where | Issue | Fix |
|---|---|---|---|---|
| H1 | **Blocker** | §5.7, §4.4 | Trims and recipe changes share one 1/day cooldown. A trim <24h before `executableAt` delays the change, so the countdown lies; the judge path does both on one basket. | State "Due · runs after {time}"; keeper holds trims <24h before a due change; separate demo baskets. |
| H2 | **Blocker** | §0, §5.3, §5.9 | Brief says USDC paths need fresh feeds; the router currently reads unguarded prices and the map assumes 24/7. If ≤25h is enforced, buy/sell die Fri close → Mon open (~65h); judges may test on weekends. | Decide now. If enforced, add "Buy/Sell closed · Get the stocks works"; testnet keeper keeps mock feeds fresh. |
| H3 | **Major** | §5.7, §5.13 | Replacement restarts the timer (confirmed, map still says "confirm"). A "Keep" on version A silently carries to B. | Re-send N1 with a diff; reset Keep; log replacements in the feed. |
| H4 | **Major** | §5.6, Q12 | `claimOwed` is caller-only, so no relayer retry; "Claim all" = N txs. | One-tap claim per token, sponsored. |
| H5 | **Major** | Basket hero, Buy | "Price" undefined: the hero shows oracle NAV, buys fill at DEX prices; off-hours they diverge. | Hero = "Value" (NAV); if fill differs >0.5%, amber chip "Fills ~0.8% lower now". |
| H6 | **Major** | §0, Buy | "No fee at buy" hides pool fees + impact; the router refunds leftovers *in kind*, so dust tokens appear in Stocks. | "Cost ≈ $0.03" beside the fee chip; hide dust < $0.01. |
| H7 | **Major** | §5.12, §4.4 | $5k cap + 1,000 test dollars + "Max" preset = ~5 users fill a basket. | Lift testnet caps (`setBasketTvlCap`); drop "Max"; clamp on NAV (what the contract checks). |
| H8 | Major | §3.2 | Market pill + test ribbon + pending banner = three bars at 360px. | One status strip by priority; ribbon becomes a 4px edge + "TEST" on balances. |
| H9 | Minor | §5.11 | Editable slippage up to 3% is for $500 users. | Fixed 1% on testnet. |

## 2. Walkthrough: first-time follower to first buy (testnet)

X post → first-reply link → **opens in X's in-app browser** → basket page → Buy (1) → Email (2) → type + Continue (3) → **switch to the mail app** and type the OTP (4) → attest (5) + Continue (6) → "Add $" → Get test dollars (7) → preset (8) → Confirm (9).
**9 taps, 5 surfaces, 1 app switch.** If dripping automatically at sign-up (D5b) is the default everywhere, it drops to 7.

Benchmarks: Robinhood ~5 taps from a stock page, $1 min, but only after account + bank link [B1]. smallcase ~6–8 taps plus broker login/2FA, browse without login [B2]. Coinbase: ID check before first buy *(verify)*.

**Tap count is competitive. Novices drop at these points instead:**
1. **In-app browser:** Google OAuth is blocked in webviews [B3]; the OTP app switch can reload the page. Use codes, never magic links; show "Open in browser" on basket pages, not only at sign-up.
2. **Attestation** reads like a trap: one sentence.
3. **"What is this money?"** Label test dollars at the drip.
4. **Dead-end success:** put the share card + Founding # there (§6).

**Recipe-change notice.** Works except H1/H3. "≈ $14 of yours moves" is the best line in the map. Exit = 2 taps.

**Exit.** Good. Add the H2 weekend state. Without single-stock sell, a novice holding withdrawn tokens is stuck; say so honestly.

**Creator create → propose.** ~3–4 min. The ticker uniqueness check needs an unspecced API; a seed slippage failure must not lose the draft; the success screen must link straight to Propose.

## 3. Mental-model risks

| Concept | Map coverage | Verdict |
|---|---|---|
| Basket token vs owning stocks | "You own a slice of 5 companies" conflicts with §7 "tokenized exposure, not shares" | **Fix.** "Your slice: 5 stocks" plus the logo row; never "own companies". |
| NAV vs price | Absent | **Fix** (H5). |
| Trim isn't a loss | "No action needed" + $ cost | OK. Add "Your value: unchanged except $0.06 cost". |
| 24h notice | Countdown + local time | OK once H1 and H3 are fixed. |
| Market closed | Pill + sheet | OK, unless H2 makes buy/sell closed. |
| Testnet vs mainnet | Ribbon, "test $" | Weak for screenshots. **Watermark share and OG cards "TEST"**. |
| Owed / held for you | Good copy | OK. Rare on testnet; build it last. |

## 4. Gaps vs architecture

- Plus H1–H7. Demo lab "Move NVDA +20%" moves a **shared** mock feed for every judge and reads as oracle control. Scope to demo-only tokens; label "Simulated price".
- `executeRebalance` is keeper-only in code, but ARCHITECTURE still says "creator or keeper". Fix the doc. The map is right.
- No email service is specced; phone users have no email.
- Multi-day recipe execution has no follower state ("Changing · day 1 of 2").

## 5. Emerging-market realities

- **Low-end Android / slow 4G:** ~150KB JS above the fold; SVG sparklines, not a chart library, on Explore; no layout shift on the PnL pair.
- **Numbers:** there is no locale plan. Use `Intl.NumberFormat` with `en-IN` (₹1,23,456 / lakh), `pt-BR` (1.234,56) and `id-ID`. USD stays the primary currency, formatted per locale.
- **Language:** English for Dec 4; no text baked into images.
- **SMS OTP:** the 45s → email fallback is right. Default to email OTP in India because of DND/DLT delays.
- **Low RAM:** tabs die on app switch; keep buy intent in the URL.

## 6. Funnel (X → landing → /try → buy → share)

Too many front doors (landing, `/explore`, `/b/:addr`, `/try`, a `try.` subdomain). **For Dec 4: one testnet host; every X link goes to `/b/:addr?s=x&p={post}`, attribution kept through auth; `/try` for judges only.**

Hooks the map is missing:
- **Founding Follower #/Creator #** from X_PLAN (the number shown on success and on the profile).
- A **follower share card**: "I'm in Capitol Tech · Founding #212", with a ref param.
- "Reply with a story" → a prefilled Create link.
- A live counter on the landing page ("214 baskets bought today", only if true).

Share should be the primary success CTA, not secondary to notifications.

## 7. Scope for Dec 4

**Cut or defer:** mainnet funding routes A/B/C and wrong-network states (mainnet = recorded proof) · notifications N2, N5–N7, N11–N18, push, Telegram · Watch/waitlist · Studio tab (make it a section) · AI suggestions · earnings calculator, mode simulation · send out, single-stock sell, display currency, "Remind me at open" · corporate-action/sequencer/offline states · two-step confirm.

**Keep:** browse first, Buy + inline faucet, Exit, recipe-change sheet, Activity (in-app), trim feed, Create, judge path (Demo lab shrunk to seeded history + one live demo change).


---

## Top 10 fixes (priority order)

1. Settle the feed-freshness rule for buy/sell (H2) and redraw the market matrix.
2. Account for the shared 1/day cooldown: state, keeper rule, separate demo baskets (H1).
3. Collapse the funnel to one testnet host. Basket-page deep links with attribution kept through auth.
4. Open-in-browser bar plus email OTP codes as the default for in-app browsers.
5. Testnet caps raised; "Max" preset removed (H7).
6. Founding # plus a follower share card as the success-screen CTA.
7. Replaced-proposal state with Keep reset and a re-notify (H3).
8. Define Value (NAV) vs fill price; show swap cost; handle dust (H5, H6).
9. Remove "own companies" copy; add a "TEST" watermark on share and OG cards.
10. Mark the §7 cuts in the map.

## Verdict

**Ready with fixes.** Fixes 1–5 must land in the map first (they change flows, not visuals); the rest can be fixed while wireframing.

## Questions for the founder

1. Do buy and sell require fresh feeds (yes = closed on weekends)?
2. Is the Dec 4 public app testnet-only, with mainnet as a recorded proof?
3. Are we allowed to lift TVL caps on testnet?
4. Will you send email for N1? With which provider? What about phone-only users?
5. Is Privy guest login enabled for `/try`?
6. Founding # badges: are they on-chain (an event) or off-chain (Ponder ordering)?
7. Should the keeper hold trims while a recipe change is pending?

## Sources
[B1] https://robinhood.com/us/en/support/articles/fractional-shares · [B2] https://www.smallcase.com/learn/how-to-invest-in-smallcase/ · [B3] https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html, https://docs.privy.io/authentication/user-authentication/login-methods/oauth.md
