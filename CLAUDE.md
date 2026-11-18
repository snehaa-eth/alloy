# Alloy (formerly "Crates") — project context

## What this is
Alloy is a "smallcase for web3": curated, thematic baskets of tokenized U.S. stocks.
- Users invest in a theme (e.g. a basket mirroring a politician's disclosed holdings, "AI Leaders") instead of picking tickers.
- Creators/curators build baskets, others subscribe and copy-trade; baskets get rebalanced.
- Stocks are tokenized via the **Dinari SDK** (dShares). KYC/compliance handled by Dinari.
- Target users: retail investors in India, Africa, LATAM, SE Asia.
- Inspiration: smallcase (India) — themed stock baskets built by SEBI-registered managers, bought through your existing broker.

## Name / brand
- Brand name is **Alloy** (metals mixed together become stronger, like tokens in a basket). Chosen 2026-11-18.
- Old name "Crates" was dropped; a separate Devfolio project "BaseCrate" exists.
- "Alloy" also clashes in search with the popular Rust Ethereum library alloy-rs (by Paradigm) and AlloyX (an RWA protocol). Use qualified handles and domains (alloy_fi, alloy.fi, etc.).
- X / Twitter: **@alloy_fi** (renamed from @trix_ai1; display name "Alloy").
  - Bio: "Invest in stories, not symbols. Curated on-chain baskets of tokenized U.S. stocks — the smallcase for web3."
  - Website field: https://crates-ui.vercel.app
  - Old posts, replies and reposts were all cleared on 2026-11-18.
- User preference for naming: short, easy to pronounce, smart & premium. The feel is "Aave/Pendle/Morpho" plus "Robinhood/Coinbase". They disliked names that sound AI-generated.

## Repo layout (v2 monorepo, moved 2026-11-19)
- `apps/web/` (was `waitlist-web-app/`): Next.js frontend. Vercel project **crates-ui**, live at https://crates-ui.vercel.app, auto-deploys on push to `main`.
- `apps/api/` (was `backend/`): Express API. Vercel project **crates-mantle**.
- `packages/contracts/`: Foundry contracts (Basket, Factory, Router, swap adapters).
- `packages/testnet-env/`: Base Sepolia test world (B20 test stocks, mock feeds, Uniswap pools, price-sync bot).
- `docs/ARCHITECTURE.md` (design) and `docs/STAGES.md` (build plan).
- **Before the first push of this layout:** set the Vercel Root Directory to `apps/web` (crates-ui) and `apps/api` (crates-mantle), or the deploys break.
- Contracts toolchain: `base-forge` / `base-anvil` / `base-cast` (Base Foundry, in ~/.foundry/bin). Stock forge 1.1.0 cannot run B20 precompiles.
- GitHub: https://github.com/snehaa-eth/crates (branch `main`).

## Rebrand status (commit 9f3bb7e "Rebrand Crates to Alloy")
Done:
- Navbar, mobile menu, launch navbar, footer, page title ("Alloy — Invest Like the Insiders") and the 404 page now say Alloy.
- X links now point to x.com/alloy_fi.
- READMEs updated.
- All user-visible "crate" copy now says "basket".

Deliberately NOT changed, because renaming would break the API or data:
- Code identifiers (`crate`, `crateId`, `useGetAllCrates`, `subscribedCrates`, `CrateCard`, `BuyCrateModal`…)
- API routes (`/api/v1/crates`) and DB fields.

Still TODO:
1. The logo images `public/assets/logo_crates.svg` and `public/assets/crates.png` still show the old Crates logo. They need new Alloy artwork.
2. Vercel domain is still `crates-ui.vercel.app`. Consider adding an alias such as `alloy-fi.vercel.app` or a custom domain.
3. GitHub repo is still named `crates`. Renaming it keeps redirects from the old name working.
4. Optional: rename internal identifiers and routes crate→basket in a coordinated frontend+backend+DB change.

## Working rules
- Never add "Co-Authored-By: Claude" or any AI attribution to commits or PRs.
- Vercel CLI is installed and logged in (team: sneha-guptas-projects). `gh` CLI is NOT installed. Git push over https works.
