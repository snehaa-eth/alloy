/**
 * ABIs Alloy's frontend needs that are not in @alloy/sdk (third-party / testnet-env contracts),
 * plus one combined error ABI used to decode any revert we can hit in a write path.
 */
import { parseAbi } from "viem";
import {
  alloyRouterAbi,
  basketAbi,
  basketFactoryAbi,
  simpleFeedGuardAbi,
} from "@alloy/sdk";

export { alloyRouterAbi, basketAbi, basketFactoryAbi, simpleFeedGuardAbi };

/**
 * Uniswap v3 QuoterV2. The quote functions are `nonpayable` on-chain (they revert internally to
 * return data), but they are only ever eth_call'ed, so they are typed `view` here to allow
 * readContract / multicall.
 */
export const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "view",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/** packages/testnet-env/src/Faucet.sol */
export const faucetAbi = parseAbi([
  "function drip()",
  "function dripTo(address recipient)",
  "function availableIn(address recipient) view returns (uint256)",
  "function cooldown() view returns (uint256)",
  "function tokens() view returns (address[])",
  "function dripAmount(address token) view returns (uint256)",
  "function lastDrip(address recipient) view returns (uint256)",
  "event Dripped(address indexed recipient, address indexed caller)",
  "error NotOwner()",
  "error CoolingDown(uint256 availableAt)",
  "error DailyCapReached()",
  "error ZeroRecipient()",
]);

/** Chainlink AggregatorV3 incl. getRoundData (the sdk only ships latestRoundData). */
export const aggregatorAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

/** B20 (Base precompile token) errors, from base-std IB20.sol. */
export const b20ErrorsAbi = parseAbi([
  "error ContractPaused(uint8 feature)",
  "error InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error InvalidSender(address sender)",
  "error InvalidReceiver(address receiver)",
  "error InvalidAmount()",
  "error SupplyCapExceeded(uint256 cap, uint256 attempted)",
  "error PolicyForbids(bytes32 policyScope, uint64 policyId)",
  "error PolicyNotFound(uint64 policyId)",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
  "error ExpiredSignature(uint256 deadline)",
]);

/** Guard errors that bubble up through Basket/Router (also in simpleFeedGuardAbi). */
export const guardErrorsAbi = parseAbi([
  "error StaleFeed(address feed, uint256 updatedAt)",
  "error FeedPaused(address feed)",
  "error BadAnswer(address feed)",
  "error MultiplierChangePending(address token, uint256 effectiveAt)",
  "error MultiplierStateUnknown(address token)",
]);

const onlyErrors = <T extends readonly { type: string }[]>(abi: T) => abi.filter((x) => x.type === "error");

/** Every custom error any Alloy write can surface. Used to decode raw revert data. */
export const allErrorsAbi = [
  ...onlyErrors(alloyRouterAbi),
  ...onlyErrors(basketAbi),
  ...onlyErrors(basketFactoryAbi),
  ...onlyErrors(simpleFeedGuardAbi),
  ...guardErrorsAbi,
  ...onlyErrors(faucetAbi),
  ...b20ErrorsAbi,
] as const;
