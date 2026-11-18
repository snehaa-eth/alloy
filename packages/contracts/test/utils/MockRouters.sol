// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IV3SwapRouter} from "../../src/adapters/UniswapV3Adapter.sol";
import {IAeroRouter, ISlipstreamRouter} from "../../src/adapters/AerodromeAdapter.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

/// @notice Records the params it was called with, pulls tokenIn, mints `out` of tokenOut to the recipient.
contract MockVenue {
    uint256 public out;
    bytes public lastCall;

    function setOut(uint256 o) external {
        out = o;
    }

    function _settle(address tokenIn, address tokenOut, uint256 amountIn, address to, uint256 minOut) internal {
        require(out >= minOut, "venue: minOut");
        require(IB20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "venue: pull");
        IB20(tokenOut).mint(to, out);
    }

    function exactInputSingle(IV3SwapRouter.ExactInputSingleParams calldata p) external payable returns (uint256) {
        lastCall = abi.encode(p);
        _settle(p.tokenIn, p.tokenOut, p.amountIn, p.recipient, p.amountOutMinimum);
        return out;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        IAeroRouter.Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        lastCall = abi.encode(amountIn, amountOutMin, routes, to, deadline);
        _settle(routes[0].from, routes[routes.length - 1].to, amountIn, to, amountOutMin);
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }
}

contract MockSlipstream {
    uint256 public out;
    bytes public lastCall;

    function setOut(uint256 o) external {
        out = o;
    }

    function exactInputSingle(ISlipstreamRouter.ExactInputSingleParams calldata p) external payable returns (uint256) {
        lastCall = abi.encode(p);
        require(out >= p.amountOutMinimum, "venue: minOut");
        require(IB20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn), "venue: pull");
        IB20(p.tokenOut).mint(p.recipient, out);
        return out;
    }
}
