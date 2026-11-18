// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {ISwapAdapter} from "../interfaces/ISwapAdapter.sol";

/// @notice Calls an allow-listed adapter with an exact approval that is reset to zero afterwards. The output is
///         measured as the recipient's balance delta (the adapter's return value is not trusted).
library SwapLib {
    error InsufficientOutput(uint256 out, uint256 minOut);

    function swap(
        address adapter,
        bytes memory poolData,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient
    ) internal returns (uint256 out) {
        SafeTransferLib.safeApprove(tokenIn, adapter, amountIn);
        uint256 before = SafeTransferLib.balanceOf(tokenOut, recipient);
        ISwapAdapter(adapter).swap(tokenIn, tokenOut, amountIn, minOut, recipient, poolData);
        out = SafeTransferLib.balanceOf(tokenOut, recipient) - before;
        if (out < minOut) revert InsufficientOutput(out, minOut);
        SafeTransferLib.safeApprove(tokenIn, adapter, 0);
    }
}
