// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {ISwapAdapter} from "../interfaces/ISwapAdapter.sol";

/// @notice Uniswap SwapRouter02 (IV3SwapRouter) — no deadline field in the struct.
interface IV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Testnet adapter. `poolData = abi.encode(uint24 feeTier)`.
contract UniswapV3Adapter is ISwapAdapter {
    using SafeTransferLib for address;

    IV3SwapRouter public immutable router;

    constructor(address router_) {
        router = IV3SwapRouter(router_);
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
        uint24 fee = abi.decode(poolData, (uint24));
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        tokenIn.safeApprove(address(router), amountIn);
        amountOut = router.exactInputSingle(
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        tokenIn.safeApprove(address(router), 0);
    }
}
