// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Swap adapter. Pulls exactly `amountIn` of `tokenIn` from `msg.sender` (exact approval), swaps on the
///         venue described by `poolData` (set by the factory owner, never by a caller) and sends the output to
///         `recipient`. MUST revert if the output is below `minOut`. MUST end holding no tokens and no allowances.
interface ISwapAdapter {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient,
        bytes calldata poolData
    ) external returns (uint256 amountOut);
}
