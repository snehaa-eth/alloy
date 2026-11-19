// Single import point for @alloy/sdk (consumed from source; see packages/sdk). Relative on purpose: Ponder's vite
// build transforms files outside node_modules, but would externalize a linked TS package and fail to load it.
// packages/sdk has no "type" field (the API on Vercel needs it CommonJS), so under plain Node + tsx the source loads
// as CJS and only exposes a default export. Read through `default` when present so this works both ways.
import * as ns from "../../../packages/sdk/src/index";

const sdk = ((ns as unknown as { default?: typeof ns }).default ?? ns) as typeof ns;

export const { alloyRouterAbi, basketAbi, basketFactoryAbi, deployments, iAggregatorV3Abi, simpleFeedGuardAbi, DECIMALS } = sdk;
