# @alloy/contracts

Alloy v2 core contracts (Base / B20): `Basket` (EIP-1167 clone vault + ERC-20 receipt), `BasketFactory`,
`AlloyRouter`, swap adapters (Uniswap v3 for testnet, Aerodrome for mainnet) and feed guards.
Spec: [`docs/ARCHITECTURE.md` §3](../../docs/ARCHITECTURE.md). Decisions, deviations, frozen events: [`NOTES.md`](./NOTES.md).

```bash
# deps (lib/ is git-ignored; see NOTES.md for versions)
base-forge install foundry-rs/forge-std base/base-std vectorized/solady --no-git

base-forge build
base-forge test          # B20 precompiles run in-process (foundry.toml: base = true)
base-forge snapshot --no-match-contract BasketInvariantTest
base-forge fmt
```

Stock `forge` cannot run B20 precompiles; always use `base-forge`.
