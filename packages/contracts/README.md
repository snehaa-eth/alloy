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
./script/export-abi.sh   # abi/*.json for packages/sdk

# Base Sepolia (validate on a local fork first; see NOTES.md)
base-anvil --fork-url https://sepolia.base.org --port 8546 --auto-impersonate
OUT_JSON=deployments/84532.fork.json NETWORK_LABEL=local-fork \
  base-forge script script/DeployAlloy.s.sol --rpc-url local_fork --broadcast --unlocked --sender <DEPLOYER>
FORK_RPC_URL=http://127.0.0.1:8546 base-forge test --mc UniswapForkTest
```

Stock `forge` cannot run B20 precompiles; always use `base-forge`.
