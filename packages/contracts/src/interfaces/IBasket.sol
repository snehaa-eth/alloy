// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBasketFactory} from "./IBasketFactory.sol";

interface IBasket {
    struct Trade {
        uint8 from;
        uint8 to;
        uint256 amountIn;
    }

    // ---- Frozen events (ARCHITECTURE §3.1) ----
    event Issued(address indexed to, uint256 shares, uint256[] amts);
    event Redeemed(address indexed from, address indexed to, uint256 shares, uint256[] amts, uint256 owedMask);
    event RecipeProposed(uint16[] w, uint64 executableAt, bytes32 reasonHash);
    event RecipeCancelled();
    event Rebalanced(uint256 navBefore, uint256 navAfter, uint256 lossBps, address indexed executor);
    event FeeAccrued(uint256 creatorShares, uint256 protocolShares);
    event ComponentRemoved(address indexed token);
    // ---- Additive events (see NOTES.md) ----
    event RecipeExecuted(uint16[] w);
    event OwedClaimed(address indexed user, address indexed token, address indexed to, uint256 amount);

    function initialize(address creator, IBasketFactory.BasketParams calldata p) external;
    function seed(uint256 shares, address to) external;

    function issue(uint256 shares, address to) external returns (uint256[] memory amts);
    function redeem(uint256 shares, address to) external returns (uint256[] memory amts, uint256 owedMask);
    function claimOwed(address token, address to) external returns (uint256 amount);
    function accrueFee() external returns (uint256 minted);
    function proposeRecipe(uint16[] calldata w, bytes32 reasonHash) external;
    function cancelRecipe() external;
    function executeRebalance(Trade[] calldata trades) external;
    function removeComponent(uint8 i) external;

    function totalSupply() external view returns (uint256);
    function creator() external view returns (address);
    function nav() external view returns (uint256);
    function navPerShare() external view returns (uint256);
    function getBundle() external view returns (address[] memory tokens, uint256[] memory balances);
    function componentValues() external view returns (uint256[] memory values);
    function previewIssue(uint256 shares) external view returns (uint256[] memory amts);
    function previewRedeem(uint256 shares) external view returns (uint256[] memory amts);
    function pendingFee() external view returns (uint256 minted);
    function nextTrimAt() external view returns (uint256);
}
