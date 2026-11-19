import { createConfig, factory } from "ponder";
import { getAbiItem } from "viem";
import { CHAIN_ID, FACTORY, NAV_SNAPSHOT_BLOCKS, ROUTER, RPC_URLS, START_BLOCK } from "./lib/config";
import { alloyRouterAbi, basketAbi, basketFactoryAbi } from "./lib/sdk";

/**
 * Alloy indexer. Chain = Base Sepolia (84532) by default; point RPC_URL at a local base-anvil fork to index a fork
 * (use a separate PGLITE_DIR / DATABASE_SCHEMA so fork data never mixes with real data).
 */
export default createConfig({
  database: process.env.DATABASE_URL
    ? { kind: "postgres", connectionString: process.env.DATABASE_URL }
    : { kind: "pglite", directory: process.env.PGLITE_DIR || ".ponder/pglite" },
  chains: {
    base: {
      id: CHAIN_ID,
      rpc: RPC_URLS.length === 1 ? RPC_URLS[0] : RPC_URLS,
      pollingInterval: Number(process.env.POLLING_INTERVAL_MS || 2_000),
      // A local anvil fork mines blocks irregularly, which breaks Ponder's finality binary search (it then walks
      // into pruned history). Use REORG_WINDOW=0 on forks; keep the default (180s) on real networks.
      ...(process.env.REORG_WINDOW ? { reorgWindow: Number(process.env.REORG_WINDOW) } : {}),
      ...(process.env.ETH_GETLOGS_BLOCK_RANGE ? { ethGetLogsBlockRange: Number(process.env.ETH_GETLOGS_BLOCK_RANGE) } : {}),
    },
  },
  contracts: {
    BasketFactory: { chain: "base", abi: basketFactoryAbi, address: FACTORY, startBlock: START_BLOCK },
    Basket: {
      chain: "base",
      abi: basketAbi,
      address: factory({
        address: FACTORY,
        event: getAbiItem({ abi: basketFactoryAbi, name: "BasketCreated" }),
        parameter: "basket",
      }),
      startBlock: START_BLOCK,
    },
    AlloyRouter: { chain: "base", abi: alloyRouterAbi, address: ROUTER, startBlock: START_BLOCK },
  },
  blocks: {
    NavSnapshot: { chain: "base", startBlock: START_BLOCK, interval: NAV_SNAPSHOT_BLOCKS },
  },
});
