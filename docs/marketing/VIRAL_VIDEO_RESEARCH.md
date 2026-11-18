# What makes launch and teaser videos spread on X

Research run 2026-11-19 with web search and page fetches. Sources are linked inline.
- **(unverified)** marks a number that comes from one secondary source, a vendor blog, or sources that disagree.
- **(judgment)** marks our own read, not a cited fact.

Companion docs: `VIDEO_IDEAS.md` (concepts and scripts) and `X_PLAN.md` (calendar).

---

## 0. The thing that matters most for Alloy right now

The Stocks Maxxing scoring has been reported as **50% traction (real onchain usage), 25% product quality, 25% public build activity**. There is also a **$6,000 prize for the best project built in public** ([CryptoBriefing](https://cryptobriefing.com/base-tokenized-stock-builder-competition/)).

- The official rules page says criteria are weighted equally unless the quest page says otherwise. The quest page FAQ doesn't list them yet ([rules](https://www.base.org/stocksmaxxing/rules), [quest page](https://www.base.org/stocksmaxxing)). So treat the 50/25/25 split as **(unverified)**.
- Either way, two conclusions hold:
  1. **Posting the build in public is part of the score**, not just marketing.
  2. **Every video should end in an action that leaves a trace onchain**: buy a basket on testnet, create a basket. Views alone don't count.
- The rules also say:
  - Anyone **"manipulating engagement or traction metrics"** is disqualified.
  - Submissions made through multiple accounts are void.
  - You can't use Base's or partners' **names, logos or trademarks** except to say accurately that you took part.

  So: no bought engagement, no bot wallets, no Base logo in our videos, and no "partnered with".

---

## 1. How X ranks posts (2023 code vs 2026 code)

### The 2026 code (xai-org/x-algorithm, open-sourced Jan 2026, updated since)
Source: [github.com/xai-org/x-algorithm](https://github.com/xai-org/x-algorithm).

The model predicts the chance of each action and adds them up with weights. Negative actions get negative weights.

| Group | What it predicts |
|---|---|
| Engagement | favorite, reply, repost, quote, share, **share via DM**, **share via copy link** |
| Clicks | post, profile, link, photo expand, video open, quoted post |
| Attention | **video quality view**, dwell, dwell time, **video continuation seconds**, profile visit seconds |
| Author | follow author |
| Negative | not interested, mute, block, report, **"not dwelled"** |

It then applies three adjustments:
- **Author diversity decay.** Each further post from the same author in one feed session counts for less. *Don't post 5 times in an hour.*
- **Out-of-network discount.** Posts from accounts the viewer doesn't follow are scored down. Reach beyond your followers mostly comes through replies and quotes by big accounts.
- **New-author boost.** Authors with low impressions get lifted toward a target position. *A small, fresh account like @alloy_fi gets some help.*

The weights live in `param.rs` and aren't in the README. Blogs quote figures like "reply = 75× like" or "copy-link share = 20" **(unverified)**; they disagree with each other ([SocialPilot](https://socialpilot.co/blog/twitter-algorithm), [Typefully](https://typefully.com/blog/x-algorithm-open-source)).

### The 2023 code (the last public weights)
Source: [the-algorithm-ml README, Apr 2023](https://github.com/twitter/the-algorithm-ml/blob/main/projects/home/recap/README.md).

| Action | Weight |
|---|---|
| like | 0.5 |
| repost | 1.0 |
| reply | 13.5 |
| good profile click | 12.0 |
| video watched 50% | 0.005 |
| **reply that the author then replies to** | **75.0** |
| negative feedback | −74 |
| report | −369 |

**What to do with this (judgment, consistent across both versions):**
1. A **reply you answer** is worth roughly 150 likes. Answer every reply in the first 60–90 minutes.
2. **Watch time now counts** (video continuation seconds, quality views). A 15s video that people watch twice beats a 90s video they quit at second 4. "Not dwelled" is a negative signal, so a slow intro actively costs you.
3. **DM shares and copy-link shares** are tracked. Make videos people send to one friend ("this is the basket I was telling you about").
4. **Links hurt reach.** Musk confirmed in Nov 2024 that link posts are deprioritised, and said to put the link in a reply ([Business Today](https://www.businesstoday.in/technology/news/story/elon-musk-confirms-that-x-deprioritises-posts-with-links-to-discourage-lazy-linking-455115-2024-11-26), [Mediaite](https://www.mediaite.com/media/news/elon-musk-admits-x-is-throttling-links-effectively-limiting-people-from-reading-news/)). A 2026 Nieman Lab analysis also found lower reach on link posts ([Journalism Pakistan summary](https://www.journalismpakistan.com/x-algorithm-penalizes-links-nieman-lab-analysis-finds)).
5. **Upload video natively.** A YouTube or Loom link shows as a link card that doesn't autoplay ([Flowjam](https://www.flowjam.com/blog/x-launch-video)). The quest rules give "a Loom recording" as an example, but you should still **upload the MP4 to X** and put the Loom in a reply if you want one.

---

## 2. Format facts

| Item | Fact or best guess | Source |
|---|---|---|
| Max length, free account | **140 s (2:20)**, 512 MB | X help centre via [Flowjam](https://www.flowjam.com/blog/x-launch-video) |
| Max length, Premium | Up to 4 h at 1080p | same |
| **Consequence for the quest demo** | **Cut it to ≤2:15**, or put Premium on @alloy_fi before Dec 4 | (judgment) |
| X Ads recommendation | ≤15 s for promoted video | X Ads specs via Flowjam |
| Sound | Most views are muted. "~80% sound-off" is widely repeated **(unverified)**. X autoplays muted with captions off, so **burn captions in**. | [NemoVideo](https://www.nemovideo.com/blog/best-ai-video-editor-x-twitter-low-views-specs), Flowjam |
| Aspect ratio | Guides disagree. **16:9** for desktop screen recordings (text stays readable). **9:16 or 4:5** for face-to-camera and mobile UI. **1:1** is the safe middle. | Flowjam, [Kapwing](https://kapwing.com/resources/how-to-post-videos-on-x-in-2025-vertical-video-tab) |
| First frame | Use the product in action or a headline frame, never a logo sting. The first frame is your thumbnail. | Flowjam |
| Export | H.264 MP4, 1080p, 30 fps | NemoVideo |
| Best times | Buffer (1M posts): weekday mornings 8–10am local. Sprout: Tue–Thu, late morning to afternoon. Weekends are weakest. | [Buffer](https://blog.bufferapp.com/best-time-to-tweet-research), [Sprout via SMT](https://www.socialmediatoday.com/news/best-times-to-post-2025-sprout-social/744014/) |

**Alloy posting window (judgment).** Our audience spans India, Africa, LATAM and SE Asia, plus US crypto X.
- **14:30 UTC** is the default slot:
  - 9:30am New York
  - 8:00pm Mumbai
  - 3:30pm Lagos
  - 11:30am São Paulo
  - 10:30pm Jakarta/Manila (late, but awake)
- **03:30 UTC** is the second slot for SE Asia and India mornings:
  - 9:00am Mumbai
  - 11:30am Singapore/Manila

---

## 3. Case studies

| Case | What happened | Why it spread | Source |
|---|---|---|---|
| **Robinhood waitlist (2013–14)** | A one-line landing page ("free stock trading"). After signing up you saw your queue position, and referrals moved you up. Reported ~1M signups before the app shipped. | The position number is a game, and the referral is the only way to play. The promise fits in one line. | [Prefinery](https://www.prefinery.com/blog/referral-programs/robinhood/), [Growth Playbook](https://thegrowthplaybook.substack.com/p/how-robinhood-turned-a-landing-page). "10k day one / 50k week one" **(unverified)**. Exact formula unknown. |
| **Coinbase Super Bowl QR (Feb 2022)** | 60s of a bouncing QR code and nothing else. Reported 20M+ landing hits in a minute; the app went from #186 to #2 in the App Store; the site briefly fell over. | Pure curiosity. No brand, no pitch, plus an offer ($15 BTC). It felt like a DVD screensaver, i.e. native internet culture. | [MediaPost](https://www.mediapost.com/publications/article/371166/coinbases-super-bowl-qr-code-ad-crashed-the-app.html), [Decrypt](https://decrypt.co/92856/coinbase-super-bowl). Cost $7M–14M **(unverified)**. |
| **Arc browser launch video (Jan 2024)** | A self-aware video: it mocked keynote hype, the CEO played along, it was set in a restaurant, it restated the problem ("browsers don't browse"), and it showed people's reactions instead of features. | Self-aware humour plus one clear problem. | [Off Menu](https://offmenu.substack.com/p/three-reasons-arcs-launch-video-went) |
| **Devin by Cognition (Mar 2024)** | "World's first AI software engineer." The product does a real-looking task (an Upwork job). Credibility came from the founders' IOI medals and a benchmark. Launch day had **15 coordinated endorsement quote-posts** (~3M combined followers). 20M–30M views **(unverified)**; others report 1.1M as of Feb 2025. | A bold, provocative claim plus proof plus a coordinated quote wave. | [Sally Liu](https://sallysliu.substack.com/p/devins-viral-recipe), [Contrary](https://research.contrary.com/report/cognition) |
| **Devin backlash** | Critics showed the demo had the AI introduce errors, then fix them, and called the Upwork task overstated. | A staged demo gets caught. On crypto X that's fatal. | [LeadDev](https://leaddev.com/process/what-devin-and-can-it-really-replace-developers) |
| **Humane AI Pin (Nov 2023)** | A slow, stiff launch film. In it, the device gave **two wrong answers** (eclipse location, almond protein). They had to recut it. | Lesson: everything shown on screen gets fact-checked by the internet. | [Business Insider](https://www.businessinsider.in/tech/news/humanes-launch-video-showed-its-hyped-ai-pin-answering-2-questions-incorrectly-the-company-says-a-corrected-video-is-on-the-way-/articleshow/105217542.cms), [Futurism](https://futurism.com/the-byte/ai-pin-mistakes-launch-video) |
| **Rabbit R1 (CES Jan 2024)** | A founder keynote with a cute orange object at a cheap price ($199). 10k preorders on day one (100k claimed **(unverified)**). Reviews were harsh later. | An object people can picture, a price, and the founder on stage. The hype outran the product. | [BGR](https://bgr.com/tech/rabbit-r1-ai-gadget-is-now-sold-out-but-you-can-still-preorder-one), [Fast Company](https://www.fastcompany.com/91231902/the-great-ai-gadget-debacle-of-2024), [TechSpot](https://www.techspot.com/news/102814-hyped-rabbit-r1-ai-device-getting-harsh-reviews.html) |
| **Nothing Phone (1) (2022)** | A drip of small teasers "every other day" for weeks, plus an invite-only sale. 200k+ on the waitlist. For Phone (3), the first teaser was just two emoji. | A cadence that keeps you in the news cycle, scarcity, and cryptic minimal posts. Some fans said the drip got tiring. | [CNBC](https://www.cnbc.com/2022/07/12/nothing-phone-1-oneplus-co-founder-carl-pei-makes-smartphone-comeback.html), [Tom's Guide](https://www.tomsguide.com/opinion/nothing-phone-1-nothing-just-took-teasing-a-new-phone-to-ridiculous-extremes) |
| **friend.tech (Aug 2023, on Base)** | No announcement. Invite-only, 3 codes per user; crypto Twitter "who's who" got in first; KOLs shared codes publicly. $1.68M in fees in two weeks. | Scarcity plus status, and your price is a public number people screenshot. | [Privy case study](https://www.privy.io/blog/friendtech-case-study), [Decrypt](https://decrypt.co/153858/what-is-friend-tech-the-social-token-driven-decentralized-social-network), [Coin360](https://coin360.com/news/friendtech-growth-popularity-overview) |
| **Polymarket (2024)** | The founder account posts only product content. The odds work as shareable screenshots that media quote. It also **paid influencers without disclosure**, which drew Bloomberg and Fortune scrutiny. | Steal the screenshot-able number. Avoid undisclosed paid posts. | [HubSpot](https://blog.hubspot.com/marketing/polymarket-marketing-strategy), [Fortune](https://fortune.com/2024/11/05/polymarket-paid-us-social-media-influencers-election-content-trump-harris/) |
| **pump.fun (2024)** | The product made content by itself (every launch is a story), then added livestreams. Livestream stunts turned ugly and the feature was suspended. | A product that generates posts. Without guardrails it causes reputational damage. | [Decrypt](https://decrypt.co/247825/what-is-pump-fun-the-solana-meme-coin-factory), [CryptoSlate](https://cryptoslate.com/solana-memecoins-turn-to-nsfw-content-as-pump-fun-livestreams-resemble-adult-webcam-site/) |
| **Hyperliquid (2024)** | No VCs, a team of ~11, and an airdrop of ~31% of supply to ~94k users. Growth was word of mouth from product quality. | A story of being on the user's side. Note the "no VC" framing is disputed. | [Yellow](https://yellow.com/research/hyperliquid-no-vc-funding-dex-volume-record), [OneKey](https://onekey.so/blog/ecosystem/hype-airdrop-breakdown/) |
| **Unusual Whales → NANC (2020–23)** | Posts flagging congressional trades kept going viral, so they launched the NANC and KRUZ ETFs. NANC returns vary by period; it once lagged KRUZ by 10+ pts over 3 months and still took $14M in inflows. | **Proof that "copy the insiders" is a proven hook.** It's also proof the returns aren't guaranteed. | [NPR](https://www.npr.org/transcripts/nx-s1-4974720), [Benzinga](https://www.benzinga.com/article/25015596), [etf.com](https://www.etf.com/sections/news/how-congress-tracking-etfs-reacted-market-drawdown) |
| **Base / Jesse Pollak** | Jesse replies to builders a lot and pushes "experiment in public". His "Base is for everyone" post was a solo experiment, not a coordinated campaign, and drew mixed results. | Base amplifies builders who ship in public. Replies from Base accounts are a big reach lever. | [Blockworks](https://blockworks.co/news/jesse-pollak-base-content-coin) |
| **Phantom** | A recurring mascot (the ghost) in every asset, plus cryptic emoji teasers on X. | A recurring character gives Phantom instant recognition. **We don't copy this:** the founder dropped our mascot on 2026-11-19. Our recognition comes from Anton type and jewel-tone basket covers. | [Phantom brand post](https://phantom.com/learn/blog/introducing-phantom-s-new-brand-identity), [Blockchain.news](https://blockchain.news/flashnews/phantom-teases-major-solana-wallet-update-potential-trading-features-and-impacts-on-sol) |
| **AI cinematic films** | Toys "R" Us made a Sora brand film. It got attention, plus a lot of "uncanny" criticism. Vendor guides say AI video mostly comes out silent, so you need separate sound. No hard data that AI teasers outperform. | AI is good for 2–4 hero shots. Don't build a whole video from it. | [Dreamina guide](https://dreamina.capcut.com/ai-video/best-ai-video-generator-for-launch-campaigns), [Flik](https://www.flikai.com/ai-trailer-generator) |
| **Copy-trading evidence** | Lab and field research finds copiers take more risk, and leaders aren't reliably better. The "53% follower gap" stat is **(unverified)**. | Our "followers vs creator" honesty angle answers a real, documented worry. | [Apesteguia et al., BSE](https://bse.eu/research/publications/copy-trading), [Bond Univ.](https://bond.edu.au/news/fomo-wrecking-your-portfolio) |

---

## 4. Patterns

1. **The first 2 seconds carry a claim, not a logo.**
   - Devin opened on the claim. Coinbase opened on a mystery. Arc opened on the problem.
   - In 2026 the code scores "not dwelled" and continuation seconds, so a slow open is penalised directly.
2. **One idea per video.** Linear's launch-video lesson: six features at five seconds each means nobody cares about any of them ([Open Design](https://open-design.ai/blog/product-launch-video-storytelling/)).
3. **A screenshot-able number in the frame.** Polymarket odds, friend.tech key prices, Robinhood queue position, NANC vs S&P. For Alloy: **"Followers +11.8% / Creator +12.4%"**, "24h notice", "$5".
4. **Real product beats a rendered promise.** Humane and Devin got punished for staged or wrong demos. Show actual screens, actual tx hashes, actual testnet.
5. **Self-aware humour.** Arc mocked keynotes. On crypto X, "we're not going to tell you this will make you rich" reads as confident.
6. **A drip cadence plus a consistent look.** Nothing's teaser rhythm. Phantom uses a ghost mascot; we use a consistent type-and-cover system instead (no mascot, decided 2026-11-19).
7. **Scarcity or status mechanics with a public number.** Robinhood's queue, friend.tech's 3 invites. For us: "Founding creator" spots, numbered.
8. **A coordinated launch-hour quote wave** (Devin's 15 quote-posts). Line up 10–15 real builders and users to quote on launch day. They must have actually used it; don't pay anyone.
9. **The link goes in a reply, the video is native, and captions are burned in.**
10. **The founder replies to everything for the first hour.** Under the 2023 weights that's worth 75× a like.

---

## 5. Steal / avoid

| Steal | Avoid |
|---|---|
| A claim or mystery in the first 2 s (Devin, Coinbase QR) | Logo stings, "Hey guys", slow push-ins on a texture before anything happens |
| Real UI, a real Base Sepolia tx, a basescan link in the replies | Mocked or "for illustration" flows passed off as the product (Devin backlash) |
| Fact-check every number on screen before posting | Wrong numbers in the video (Humane's almonds) |
| One idea, one number, one CTA | Feature montage |
| Self-aware wit (Arc) | Fake hype, "this changes everything", countdown to nothing |
| One consistent look: Anton type + jewel-tone basket covers | Switching visual styles every post; mascots (dropped 2026-11-19) |
| A drip cadence of 1 hero post a day (Nothing) | Posting 5 times in a row (author diversity decay); a drip so slow people forget |
| Screenshot-able numbers (Polymarket) | Undisclosed paid influencers (Polymarket got burned) |
| Position or status mechanic (Robinhood, friend.tech) | Pay-for-activity or bot wallets: quest rules disqualify "manipulated traction" |
| Founder in the replies within 60 min | Posting and leaving |
| Native MP4, link in the first reply | YouTube/Loom link as the main post |
| AI for 2–4 texture shots (silk, smoke), never characters | 100% AI film: uncanny, silent, reads as "AI slop" to crypto X |
| "Congress discloses trades" as a public-record hook (NANC) | Implying a politician endorses, is involved, or that copying = profit |
| Showing the downside (followers behind creator, market closed) | "Passive income", "beat the market", return screenshots without dates |

---

## 6. Alloy-specific compliance filter (apply to every video)

From `docs/ARCHITECTURE.md` §7, `docs/design/COPY.md` and the quest rules.

- [ ] No "backed by / partnered with / powered by / endorsed by" Coinbase or Base. Use "**Built on Base, not by Base.**"
- [ ] No Base or Coinbase logo, and no Base blue square used as a design element. Company logos (NVDA etc.) are not used either; tickers appear as plain text.
- [ ] Say "**tokenized stock exposure**". Never "own shares", "dividends to you" or "voting".
- [ ] "Not available to US persons" appears in the video end card or the first reply.
- [ ] Story baskets: "**Built from public disclosures dated {date}. {Person} isn't involved.**" No photo or likeness of the person.
- [ ] No return promises. Any chart shows dates plus "Past performance isn't a promise."
- [ ] AI output is labelled "AI-suggested. Not investment advice." AI-generated footage gets a small "AI-assisted visuals" credit in the reply (judgment, matches the founder's "AI labelled" rule).
- [ ] feel.cash is a **Stocks Maxxing partner**, not "our partner", unless a real partnership is signed.
- [ ] The demo says "testnet" whenever the screen shows Base Sepolia.
