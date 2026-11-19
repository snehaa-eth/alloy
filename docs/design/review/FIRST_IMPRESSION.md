# First impression: Alloy (cold visitor, 2026-11-19)

I had one sentence of context. I looked at localhost:3000 at 1440×900 and 390×844 and viewed the home page, Explore, Portfolio, one basket ("The AI Build-Out") and the buy sheet.
Screenshots: `/private/tmp/claude-501/-Users-snehagupta-Desktop-crates/a5f91931-8d98-483d-a5f2-e56ce7450084/scratchpad/fresh/shots/`

## 1. 5-second test
- I read "INVEST IN STORIES, NOT SYMBOLS." as a slogan, not a description. The line under it, "Baskets of US stocks built around one idea", is what actually told me what this is. The headline only clicks after I've read the subhead.
- The pill "Tokenized US stocks · on Base" plus the "Test network" badge made me think "crypto demo" before "investing app". For a normal investor, the word "tokenized" sounds risky.
- The featured card on the right (NVDA 40% / MSFT 25%…) is the clearest thing on the screen. It shows the product better than the headline does.

## 2. After 1 minute
In my words: you pick a themed basket that someone built. You put in $5 or more in USDC and get one token that holds all the stocks. The creator's rules rebalance it, and you can sell any time.

Still unclear:
- **"24h notice"** in the hero. Notice of what? I only learned on the basket page that it means "Change notice": recipe changes wait 24 hours. As a hero stat with no context it means nothing.
- **"TAB"**: in "You get 24.97 TAB". What is TAB? It's never explained.
- **"Value per token $0.99"**: I paid $1 and it's worth $0.99 already? Is the 1% gone on day one?
- **"Keep the mix"** on the basket hero, **"Let winners run / Ride the trend / Keep the mix"** in How it works. Three strategy names show up with no indication of which one a given basket uses or why I should care.
- **"Followers vs creator: New"**, **"Founding · Be #1"**, **"Creator · New"** on every card. Every stat slot reads "New / Be #1", so the cards are full of words that carry no information.
- **"@alloy_fi · $998.02 in"**: is that the creator's own money? It reads like a price.
- **"Did followers win too?"** shows "+11.8% / +12.4%", labelled "Example" in tiny type. Showing fake performance in a big green number feels bad.
- **"Bottle it"**, **"Four beats"**: cute copy, but it costs clarity.
- **"Alloy Demo: Judges' Basket"** is visible to the public. "Judges" means nothing to me and makes the site look like a hackathon entry.
- **"Sign in"**: sign in with what? Email? A wallet? Nothing says.

## 3. Would I trust it with money?
No, not yet:
- Every basket is made by the same account (@alloy_fi), has 0 followers, and is "New". It looks empty and self-seeded.
- The two banners "Test network" and "Base Sepolia test network" plus "Add test money" say outright that it isn't real yet.
- There's no "who runs this", no custody explanation (who holds the stocks?) and no legal entity. "Tokenized stock exposure, not shares · Not available to US persons" is tucked into the footer, and that's exactly the trust question I'd ask first.
- The sample performance block uses invented numbers.

What does help: the fee is stated plainly ("1% a year", "Cost ≈ $0.04"), the creator's stake is visible ("Skin in the game"), and it says "You can lose money".

## 4. Visual gut reaction
Mostly **premium-dark, on-trend**, but a bit generic "crypto dark mode with a maroon accent".
- **Hero**: the condensed all-caps display font is bold and memorable, but the three-colour headline (white / crimson / grey) is fussy. The grey "NOT SYMBOLS." looks disabled.
- **Featured card**: nice. The tilted ghost cards behind it are good depth. Its four stat tiles hold almost nothing ("New", "Be first").
- **Ticker strip**: generic finance trope. It also shows market prices, while the next line says "market closed".
- **How it works (desktop)**: the scroll-pinned section creates a huge empty black void (about 600px of nothing) in the full-page view, and on fast scroll it feels like the page broke. Inactive steps are very low contrast grey on black.
- **Basket cards**: the art (circuit, planet, pickaxe) is moody and consistent. Good. But the cards are visually identical apart from the art, and the striped "alloy bar" under each one is decorative. I couldn't read allocation from it.
- **Emoji** (🚀📈🎯) in How it works and on the basket hero clash with the otherwise serious, premium type. They look cheap.
- **Alignment**: the Portfolio page title sits about 8px left of the logo/content column. The Portfolio and Me empty states are a single sign-in button in a huge black void.
- **Buy modal (desktop)**: it opens on top of an already-visible buy panel, so the same form appears twice. The modal has a big empty band at the top, and a stray "↗ Buy" chip floats there with no clear purpose.
- Colour: maroon + cream + green works. The yellow/gold "$998.02" accent adds a fourth colour that competes.

## 5. Desktop vs phone
- **Phone home, How it works**: each of the four steps renders a full, tall chart card with a lot of empty space at the bottom (big dead areas). The strategy list (🚀📈🎯) repeats under step 4. The section is about 3 screens long for 4 sentences.
- **Phone basket page**: **no Buy button is visible while scrolling**. Only the bottom tab bar is on screen. The "Value per token $0.99 · Buy" bar shows up only at the very end of the page, after Key stats. This is the single biggest conversion leak.
- **Phone Explore**: the filter chips overflow and the sort pill gets cut off ("Most follo…"). The "+" create button has no label.
- **Phone buy sheet**: works and reads well. The Next.js dev badge overlaps the "test dollars" row (dev only).
- **Phone home**: the "Featured story" card starts below the fold. The fold is all slogan, no product.
- **Desktop**: wide margins and well proportioned. The main issues are the How-it-works void and the duplicated buy UI.

## 6. Top 10 fixes
1. **Make Buy always reachable on the phone basket page.** Pin a "Buy · from $5" bar above the tab bar for the whole page.
2. **Rewrite the hero headline so it says what the product is.** For example: "Invest in ideas, not tickers. Themed baskets of US stocks from $5." Keep the slogan as the kicker, not the explanation.
3. **Kill the empty-state jargon on cards.** When there's no history, don't show "New / Be #1 / New". Show real data instead: the top holdings with weights, the fee and the minimum. Hide "Followers vs creator" until it has data.
4. **Explain the three money words in one place**: TAB (the basket token), "value per token" and "$X in". Use a tooltip, or rename them, e.g. "You get 24.97 basket tokens (≈ $24.96)".
5. **Add a trust strip near the top**: who holds the stocks, who issues the tokens, where you can withdraw, and who's eligible. Move "Not available to US persons" up from the footer.
6. **Remove the fake performance numbers** (+11.8% / +12.4%), or label them clearly as an illustration. Better: show the real follower-vs-creator panel from a live basket.
7. **Fix the How it works section**: no pinned void on desktop, and on phone collapse it to one compact animated card or four short rows. Drop the emoji and use the icon style the rest of the site already uses.
8. **Hide internal or demo baskets** ("Alloy Demo: Judges' Basket", "Demo" tags) from the public Explore page and the home page. Get at least 2–3 different creators on the page.
9. **De-duplicate the desktop buy UI.** Clicking Buy should focus or expand the right-hand panel, not open a second modal. Remove the empty header band and the stray "↗ Buy" chip in the sheet.
10. **Polish**: replace the "24h notice" hero stat with something people understand ("1% / yr fee" or "Sell anytime"). Fix the Explore chip overflow on phone and label the "+" button. Left-align the Portfolio title with the grid. Give the Portfolio and Me empty states a preview of what you'll see after signing in. Say what "Sign in" uses (email or wallet).
