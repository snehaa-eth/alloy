// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {ISwapAdapter} from "../interfaces/ISwapAdapter.sol";

/// @notice Aerodrome v2 Router. UNVERIFIED (from memory): Base router 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43.
interface IAeroRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @notice Aerodrome Slipstream (CL) SwapRouter. UNVERIFIED (from memory): 0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5.
interface ISlipstreamRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        int24 tickSpacing;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Mainnet adapter (minimal; addresses and pool kinds MUST be verified on a fork — see NOTES.md).
///         `poolData = abi.encode(uint8 kind, bool stable, address poolFactory, int24 tickSpacing)`;
///         kind 0 = v2 (stable/poolFactory used), kind 1 = Slipstream (tickSpacing used).
contract AerodromeAdapter is ISwapAdapter {
    using SafeTransferLib for address;

    error UnknownKind(uint8 kind);

    uint8 public constant KIND_V2 = 0;
    uint8 public constant KIND_SLIPSTREAM = 1;

    IAeroRouter public immutable v2Router;
    ISlipstreamRouter public immutable clRouter;

    constructor(address v2Router_, address clRouter_) {
        v2Router = IAeroRouter(v2Router_);
        clRouter = ISlipstreamRouter(clRouter_);
    }

    /// @inheritdoc ISwapAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient,
        bytes calldata poolData
    ) external returns (uint256 amountOut) {
        (uint8 kind, bool stable, address poolFactory, int24 tickSpacing) =
            abi.decode(poolData, (uint8, bool, address, int24));
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        if (kind == KIND_V2) {
            tokenIn.safeApprove(address(v2Router), amountIn);
            IAeroRouter.Route[] memory routes = new IAeroRouter.Route[](1);
            routes[0] = IAeroRouter.Route({from: tokenIn, to: tokenOut, stable: stable, factory: poolFactory});
            uint256[] memory amounts =
                v2Router.swapExactTokensForTokens(amountIn, minOut, routes, recipient, block.timestamp);
            amountOut = amounts[amounts.length - 1];
            tokenIn.safeApprove(address(v2Router), 0);
        } else if (kind == KIND_SLIPSTREAM) {
            tokenIn.safeApprove(address(clRouter), amountIn);
            amountOut = clRouter.exactInputSingle(
                ISlipstreamRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    tickSpacing: tickSpacing,
                    recipient: recipient,
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
            tokenIn.safeApprove(address(clRouter), 0);
        } else {
            revert UnknownKind(kind);
        }
    }
}
