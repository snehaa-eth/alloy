import { parseAbi } from "viem";

export const feedAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function paused() view returns (bool)",
  "function isUpdater(address) view returns (bool)",
  "function owner() view returns (address)",
  "function updateAnswer(int256 answer)",
  "function updateAnswerAt(int256 answer, uint256 updatedAt)",
  "function setPaused(bool paused)",
  "error NotOwner()",
  "error NotUpdater()",
  "error FeedPaused()",
  "error InvalidAnswer()",
  "error InvalidTimestamp()",
]);

export const b20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function multiplier() view returns (uint256)",
  "function uiMultiplier() view returns (uint256)",
  "function newUIMultiplier() view returns (uint256)",
  "function effectiveAt() view returns (uint256)",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
  "error InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error PolicyForbids(bytes32 policyScope, uint64 policyId)",
]);

export const poolAbi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() view returns (uint128)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
]);

export const swapRouter02Abi = parseAbi([
  "struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }",
  "function exactInputSingle(ExactInputSingleParams params) payable returns (uint256 amountOut)",
]);

export const quoterV2Abi = parseAbi([
  "struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; uint24 fee; uint160 sqrtPriceLimitX96; }",
  "function quoteExactInputSingle(QuoteExactInputSingleParams params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

export const registryAbi = parseAbi([
  "function isOraclePaused(address feed) view returns (bool)",
  "function setOraclePaused(address feed, bool paused)",
]);

/** Base-mainnet Chainlink AggregatorV3 (for mirror mode with PRICE_SOURCE=chainlink). */
export const aggregatorAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);
