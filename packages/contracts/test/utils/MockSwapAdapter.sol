// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ISwapAdapter} from "../../src/interfaces/ISwapAdapter.sol";
import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

/// @notice Swaps at oracle price +- configurable slippage by pulling tokenIn and MINTING tokenOut (needs MINT_ROLE).
///         USDC is priced at $1. Positive `slippageBps` = worse than oracle, negative = better.
contract MockSwapAdapter is ISwapAdapter {
    address public immutable usdc;
    mapping(address => address) public feedOf;
    int256 public slippageBps;
    mapping(address => int256) public tokenSlippageBps; // extra per tokenOut

    constructor(address usdc_) {
        usdc = usdc_;
    }

    function setFeed(address token, address feed) external {
        feedOf[token] = feed;
    }

    function setSlippage(int256 bps) external {
        slippageBps = bps;
    }

    function setTokenSlippage(address token, int256 bps) external {
        tokenSlippageBps[token] = bps;
    }

    function priceOf(address token) public view returns (uint256) {
        if (token == usdc) return 1e8;
        (, int256 a,,,) = IAggregatorV3(feedOf[token]).latestRoundData();
        return uint256(a);
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 out) {
        uint256 decIn = IB20(tokenIn).decimals();
        uint256 decOut = IB20(tokenOut).decimals();
        out = amountIn * priceOf(tokenIn) * (10 ** decOut) / (priceOf(tokenOut) * (10 ** decIn));
        int256 slip = slippageBps + tokenSlippageBps[tokenOut];
        out = uint256(int256(out) * (10_000 - slip) / 10_000);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient,
        bytes calldata
    ) external returns (uint256 out) {
        require(IB20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "pull");
        out = quote(tokenIn, tokenOut, amountIn);
        require(out >= minOut, "MockSwapAdapter: minOut");
        if (out > 0) IB20(tokenOut).mint(recipient, out);
    }
}

/// @notice Adapter that tries to re-enter the basket during a swap; records the outcome then reverts if re-entry
///         succeeded.
contract ReentrantAdapter is ISwapAdapter {
    address public target;
    bytes public payload;
    MockSwapAdapter public inner;

    constructor(MockSwapAdapter inner_) {
        inner = inner_;
    }

    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        payload = payload_;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient,
        bytes calldata d
    ) external returns (uint256) {
        if (target != address(0)) {
            (bool ok, bytes memory ret) = target.call(payload);
            require(!ok, "reentered!");
            require(ret.length >= 4 && bytes4(ret) == bytes4(0xab143c06), "unexpected revert");
        }
        require(IB20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "pull");
        IB20(tokenIn).approve(address(inner), amountIn);
        return inner.swap(tokenIn, tokenOut, amountIn, minOut, recipient, d);
    }
}
