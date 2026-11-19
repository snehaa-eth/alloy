# Script research: making a short launch video people understand

Written 2026-11-19, before any visuals. Trigger: a real user watched the 26 s teaser (`../video/alloy-idea-01/`) and said it was "too fast, can't read any text, the narrative isn't understandable."

How to read the tags:
- **[src]**: backed by the linked source. Many are vendor blogs, which are fine for rules of thumb and weak as evidence.
- **(unverified)**: one secondary source, sources that disagree, or my memory without a link I fetched.
- **(judgment)**: our own call.

---

## 0. What went wrong with alloy-idea-01, in numbers

| Measure | alloy-idea-01 | Problem |
|---|---|---|
| Runtime | 26 s | Too short for the number of ideas in it |
| Scenes | 13 (about 2 s each, about 1 s in S3) | The eye had to find new text every 1 to 2 s |
| Separate ideas | about 9 (which stocks, buy the idea, pick a story, $5, one token, drift, trim, followers vs creator, creators, exit, tagline) | That's roughly 1 idea every 2.9 s. §4 suggests 1 every 6 to 8 s for a first-time viewer |
| Headline style | Abstract, all caps, compressed ("PRICES DRIFT.", "WE TRIM IT BACK.") | Each line needs the line before it to make sense. Miss one and you lose the thread |
| Words that need prior knowledge | token, drift, trim, thesis, recipe | Asha (P1 in UX_MAP) knows none of these from investing |

The message was mostly right. **The density was wrong**: about 2.5 times too many ideas per second, and the text needed knowledge the viewer didn't have. (judgment)

---

## 1. Structure: how short explainers are built

### 1.1 The common skeletons
- **PAS (Problem, Agitate, Solution)** and **BAB (Before, After, Bridge)** are the two formulas ad scriptwriters use most for 30 to 60 s ads. In BAB, "Before" is the viewer's problem, "After" is life once it's solved, and the product is the "Bridge" [src: [adcreate](https://adcreate.com/blog/ad-copywriting-formulas-frameworks), [benly.ai](https://benly.ai/learn/ad-creative/video-ad-structure-frameworks), [fluxnote](https://fluxnote.io/guides/how-to-script-video-ads-that-convert)].
  - Their timings differ. One puts Before at 0–8 s, After at 8–18 s and Bridge at 18–30 s; another adds a CTA at 27–30 s (unverified, vendor blogs).
  - Advice that repeats across sources:
    - Make "Before" specific enough that viewers see themselves in it.
    - Show "After" rather than describe it.
    - Carry one message per video.
    - Repeat the CTA in both picture and words.
- **Problem → Product → Proof → CTA** is the explainer version of the same arc. Classic explainer agencies script about 150 words per 60 s and follow problem, solution, how it works, CTA [src: [Bread & Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/), [VideoScribe](https://blog.videoscribe.co/how-to-write-the-perfect-explainer-video-script)].
- **Google/YouTube ABCD**:
  - **Attract:** front-load the story.
  - **Brand:** brand early and often.
  - **Connect:** use emotion and people.
  - **Direct:** give a clear CTA.

  Google reports a Kantar-backed lift and says the data is correlational [src: [Google Ads help](https://support.google.com/google-ads/answer/14783551), [Think with Google](https://business.google.com/us/think/future-of-marketing/creative-best-practices-youtube-ads/)]. The "brand within 5 seconds" rule appears in third-party write-ups, not in Google's primary docs (unverified).

### 1.2 Hook formulas that suit Alloy
1. **Tension in "you" form.** "You want to invest in AI. But which stocks?" It names a want and a blocker in under 10 words. Problem/solution ads open the same way [src: adcreate, fluxnote above].
2. **Analogy.** "Like a playlist, but for stocks." It maps something new onto something known. (judgment: fast to grasp. The risk is that people carry over what doesn't fit; playlists can't lose money.)
3. **Character.** "Priya wants to invest in AI." A named person makes the steps a story with cause and effect ("so she…", "weeks later…"), and a story is easier to retell. This is ABCD's "Connect" [src: Google above]. The retelling claim is (judgment).

Two hook rules for us:
- **Avoid "Ever wondered…?" openers.** COPY.md bans rhetorical-question openers. A single, real question as the second line ("But which stocks?") is allowed.
- **The hook must work with the sound off.** See §3.

### 1.3 One idea per scene
- **Mayer's multimedia principles** have strong evidence from many controlled experiments [src: [Mayer 2020 PDF](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf), [Dartmouth summary](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655)]:
  - **Coherence:** cut extra material. About d = 0.70–0.86.
  - **Signaling:** highlight the structure.
  - **Segmenting:** use short chunks rather than one stream.
  - **Redundancy:** full on-screen text that repeats the narration hurts learning, *except when the on-screen text is very short*.
- **What that means for us:**
  - One new idea per scene.
  - Keep on-screen text short, as the key phrase rather than a transcript.
  - The voiceover may say a slightly fuller sentence built around the same words.
  - Cut anything that isn't the idea of that scene, such as ticker-wall flicker and camera shake behind text. (judgment, from Mayer)

---

## 2. How many ideas fit in 30, 45 and 60 s

| Fact | Source |
|---|---|
| Voiceover pace: about 130–160 words per minute; about 150 words for a 60 s explainer | [Bread & Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/), [VideoScribe](https://blog.videoscribe.co/how-to-write-the-perfect-explainer-video-script), [Typecast](https://typecast.ai/learn/?p=14931) (vendor blogs) |
| Slower pace for technical or unfamiliar material | Typecast (vendor) |
| Videos under 1 min average about 52% engagement on Wistia, so half the viewers leave by the middle | [Wistia State of Video](https://www.wistia.com/state-of-video) |

From those facts, our working budget (judgment):
- A new idea needs about **5–8 s** for a first-time investor reading in a second language:
  - 1 card to state it (3–4 s),
  - 1–3 s of picture that proves it.
- **30 s ≈ 3–4 ideas · 45 s ≈ 5–6 ideas · 60 s ≈ 7–8 ideas**, counting the hook and CTA as ideas.
- **Front-load.** Given Wistia's ~52%, the first half must already answer "what is Alloy?" by itself. Everything after the midpoint is a bonus.
- **Our target is 50–60 s with 6–7 ideas.** We have too much to explain for 30 s without cramming. At over 60 s, a muted feed loses people.

---

## 3. Reading speed: the hold-time rule

### 3.1 The numbers
| Source | Number |
|---|---|
| Adult silent reading, English non-fiction, meta-analysis of 190 studies | **238 wpm ≈ 4.0 words/s** [src: [Brysbaert 2019](https://www.Gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf)] |
| Reading aloud | 183 wpm ≈ 3.0 words/s [src: Brysbaert] |
| Netflix adult subtitles | 17 or 20 characters/s (sources disagree) ≈ 3–3.5 words/s. Max 7 s per subtitle, min about 0.83 s [src: [Netflix PT guide](https://backlothelp.netflix.com/hc/en-us/articles/216787938-Portuguese-Timed-Text-Style-Guide); the 20 cps figure via [subtitle-toolset](https://subtitle-toolset.pages.dev/guides/subtitle-reading-speed/) (unverified)] |
| BBC subtitles | 160–180 wpm ≈ 2.7–3.0 words/s (unverified: secondary sources) |
| Netflix children's subtitles | 13 cps / 160 wpm ≈ 2.7 words/s [src: Netflix PT guide] |

### 3.2 Why our rule is slower than those numbers
1. Brysbaert measures **continuous text a reader is already looking at**. A video card first has to be **found** after a cut, so the eye needs to move and settle. Subtitles avoid this because they always sit in the same place. Ours move around the frame.
2. Our viewers are mostly **reading English as a second language**: India, Nigeria, Brazil, Indonesia. That's slower than a native reader, so we plan for children's-subtitle speed or slower. (judgment)
3. The picture competes with the text, since each card has an animation under it.
4. The user test failed on speed, so we pick numbers that are hard to fail.

### 3.3 The rule we use in SCRIPTS.md
> **Hold time = 1.0 s (find + settle) + words ÷ 2.5, rounded up to the next 0.5 s. Minimum 2.0 s. Max 8 words per card** (the end card with legal text is the only exception).
>
> Word count: split on spaces. "$5", "24", "US" and "@alloy_fi" each count as 1.
>
> When a legal micro-line sits on screen at the same time, its words count toward that card's hold.

| Words | Required hold |
|---|---|
| 1–2 | 2.0 s |
| 3 | 2.5 s |
| 4–5 | 3.0 s |
| 6 | 3.5 s |
| 7 | 4.0 s |
| 8 | 4.5 s |
| 9–10 | 5.0 s |
| 13 | 6.5 s |
| 14–15 | 7.0 s |
| 19 | 9.0 s |

Effective speed is 2.5 words/s for the words plus a 1 s orientation buffer. That's slower than BBC/Netflix adult speeds (about 3 words/s) and close to children's speed (about 2.7), on purpose.

Other text rules:
- **No karaoke and no word-by-word reveals.** The whole line appears at once, so the reader controls the pace (Mayer's segmenting).
- **The text sits in the same place on every card**, the upper third, to cut search time. (judgment, from how subtitles are placed)
- **Nothing important moves while text is on screen.** Motion happens between cards or below the text.
- **Run the voiceover below 150 wpm.** Our scripts run 85–100 wpm because the picture needs time to show proof.

---

## 4. Captions vs voiceover on X (sound off)

- **X autoplays video muted** in the timeline. X's help centre says captions show automatically on muted timeline videos on iOS and Android, and Twitter announced auto-captions in 2021 [src: [X Help](https://help.x.com/en/using-twitter/twitter-videos.html), [PhoneArena](https://www.phonearena.com/news/twitter-automatic-video-captions-update_id137169)].
  - An uploaded SRT may not show while scrolling, so short clips should burn in their text [src: [blitzcut blog](https://blitzcutai.com/blog/how-to-add-captions-x-twitter-video) (unverified, vendor)].
- **How often people watch with the sound off:**
  - About 85% of Facebook video (2016) [src: [TechCrunch](https://techcrunch.com/2016/06/14/facebook-content-and-brand-strategies-that-win-in-a-silent-auto-play-world/)].
  - About 92% of US consumers watch with the sound off on mobile (Verizon/Publicis 2019, via [Kapwing](https://kapwing.com/resources/subtitle-statistics), unverified).
  - These are old or vendor numbers. The direction is clear even if the exact figure isn't.
- **Decision (judgment):**
  - **The on-screen text is the script.** It must tell the whole story with sound off.
  - The voiceover is optional sweetening. It says the same idea in a slightly longer, natural sentence, never something new the sound-off viewer would miss.
  - If we add VO, also upload an SRT of the VO for accessibility.
  - Music stays low and doesn't drive the cuts. alloy-idea-01 cut on every beat at 120 BPM, which forced 2 s scenes.

---

## 5. Plain language for financial products

- The **SEC Plain English Handbook** asks for:
  - short sentences,
  - active voice,
  - everyday words,
  - "you",
  - concrete over abstract,
  - and for defining or avoiding jargon.

  [src: [SEC handbook](https://www.sec.gov/files/handbook.htm), [plainlanguage.gov](https://plainlanguage.gov/resources/guides/plain-english-handbook/)]
- **Grade level:**
  - Nielsen Norman Group reportedly recommends a grade 6 reading level for homepages and grade 8 elsewhere (via [Intuit content design](https://contentdesign.intuit.com/accessibility-and-inclusion/readability/), unverified secondhand).
  - A VisibleThread study found the best-performing banks average about grade 7, and the worst about grade 11 [src: [The Financial Brand](https://thefinancialbrand.com/news/bank-marketing/bank-credit-union-marketing-messages-communications-77720)].
- **Wise** uses short declarative fragments: "No asterisks. No small print. No hidden fees." [src: [wise.com/our-mission](https://wise.com/our-mission)]. Its explainers compare against the bank, a thing everyone knows [src: [Wise blog](https://www.wise.com/au/blog/how-does-transferwise-work)].
- **Robinhood, Revolut and Cash App** (unverified; from memory, not fetched):
  - Their launch ads show the app doing one thing per shot and keep text to a few words.
  - Robinhood Learn defines each term in one plain sentence before using it.
  - Treat this as a pattern to watch for, not a cited fact.
- **Rules for Alloy scripts (judgment, from the above + COPY.md):**
  1. Every term the viewer must keep gets a **≤5-word plain definition the first time it appears.** "Basket" = "a few US stocks, one idea."
  2. **Banned in the script body:** NAV, rebalance, drift, token, tokenized, vault, USDC, thesis, recipe, keeper, in-kind.
     - The exception is the required legal line ("Tokenized stock exposure, not shares"), which stays word-for-word for compliance.
     - "Trim" is allowed because the picture shows a bar shrinking.
  3. **Numbers as digits** ("$5", "5 US stocks"). Digits are faster to scan.
  4. **Name the risk once, plainly.**

---

## 6. Founder and launch videos worth studying

- **Dropbox, 2008–09.** The demo video reportedly grew the beta waitlist from 5,000 to 75,000 overnight [src: [TechCrunch Founder Stories](https://techcrunch.com/?p=441556), [launchtomorrow](https://blog.launchtomorrow.com/dropbox-mvpexplainer-video-youre-missing-most-of-the-story/)].
  - The "+10% conversion / $48M" figure is widely repeated without a primary source (unverified).
  - Lesson: a slow, plain walk through one real use case beats polish.
- **The Browser Company (Arc) and Linear launch films** (unverified; from memory, not fetched):
  - The founder talks to camera at a calm pace, and the product shows one action per shot.
  - Lesson for us: calm is premium. Fast cuts read as hype.
- **Pattern across these** (judgment):
  - one real person,
  - one real task,
  - the product doing it on screen,
  - few words,
  - ends on what to do next.

---

## 7. Tests to run on a script before production

| Test | How | Pass if |
|---|---|---|
| **5-second test** | Show only what's on screen by 0:05 (or read those cards aloud), then ask: "What's this about?" The method is credited to Christine Perfetti, mid-2000s [src: [Smashing Magazine](https://smashingmagazine.com/2023/12/five-second-testing-case-study)]. It measures first impressions, not full understanding [src: same]. | They name the tension ("investing in AI / which stocks") |
| **12-year-old test** | Read the on-screen text only to someone with no investing background. Have them explain it back. | Their retelling contains: basket of stocks around an idea, $5, Alloy handles the balance. Rooted in the "curse of knowledge": in Newton's 1990 tapping study, tappers predicted 50% of listeners would name the song, and 2.5% did [src: [The Decision Lab](https://www.thedecisionlab.com/reference-guide/management/curse-of-knowledge)]. The writer always overestimates how clear they are. |
| **Read-aloud timing** | Read every card aloud at a normal pace with a stopwatch, starting the clock as the card "appears". Add 1 s. | Every card's real hold ≥ that time |
| **Silent read-along** | Play an animatic (cards on black, at the script's holds) to someone reading in their second language | They never say "wait" and never ask to rewind |
| **Recall test** | After one viewing, ask "What does Alloy do?" and four more questions (USER_TEST.md) | ≥2 of 3 people answer the first question correctly without help |
| **Jargon audit** | Search the script for the banned list in §5 | Zero hits outside the legal line |
| **Compliance check** | ARCHITECTURE §7 + COPY §1 | See the checklist in SCRIPTS.md |

**Cheapest production step before full animation:** a **text-only animatic**: white text on black, at the script's hold times, with the same order. If that isn't understood, no animation will save it. (judgment)
