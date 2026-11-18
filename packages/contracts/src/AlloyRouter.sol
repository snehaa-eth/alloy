// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

import {IBasket} from "./interfaces/IBasket.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {SwapLib} from "./libraries/SwapLib.sol";

/// @title AlloyRouter
/// @notice Stateless USDC <-> basket router. Users are protected only by their own `minOuts` / `minShares` /
///         `minUsdc`. Every call ends with the router holding zero tokens and zero allowances.
/// @dev Feeds are read (unguarded, via `Basket.componentValues`) only to split USDC by bundle value; a bad split
///      can only cost the user leftovers (refunded in kind), never more than their own `minShares` allows.
contract AlloyRouter is ReentrancyGuardTransient {
    using SafeTransferLib for address;

    event Bought(address indexed user, address indexed basket, uint256 usdcIn, uint256 shares);
    event Sold(address indexed user, address indexed basket, uint256 shares, uint256 usdcOut);

    error UnknownBasket();
    error LengthMismatch();
    error InsufficientShares(uint256 shares, uint256 minShares);
    error InsufficientUsdc(uint256 out, uint256 minUsdc);
    error RedeemIncomplete(uint256 owedMask);
    error ZeroAmount();

    IBasketFactory public immutable factory;
    address public immutable usdc;

    constructor(address factory_) {
        factory = IBasketFactory(factory_);
        usdc = IBasketFactory(factory_).usdc();
    }

    /// @notice USDC -> components (split by current bundle value) -> issue max affordable shares to msg.sender.
    ///         Leftover components / USDC are refunded to msg.sender.
    function buy(address basket, uint256 usdcIn, uint256[] calldata minOuts, uint256 minShares)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (!factory.isBasket(basket)) revert UnknownBasket();
        if (usdcIn == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);

        IBasket b = IBasket(basket);
        b.accrueFee(); // so `ts` below equals what issue() will use (a second accrue in the block mints 0)
        (address[] memory comps, uint256[] memory bals) = b.getBundle();
        uint256 n = comps.length;
        if (minOuts.length != n) revert LengthMismatch();
        uint256[] memory vals = b.componentValues();
        uint256 totalVal;
        for (uint256 i; i < n; ++i) {
            totalVal += vals[i];
        }
        if (totalVal == 0) revert ZeroAmount();

        uint256[] memory got = new uint256[](n);
        {
            uint256 spent;
            for (uint256 i; i < n; ++i) {
                uint256 slice = i == n - 1 ? usdcIn - spent : FixedPointMathLib.mulDiv(usdcIn, vals[i], totalVal);
                spent += slice;
                if (slice == 0) continue;
                IBasketFactory.TokenConfig memory c = factory.tokenConfig(comps[i]);
                got[i] = SwapLib.swap(c.adapter, c.poolData, usdc, comps[i], slice, minOuts[i], address(this));
            }
        }

        uint256 ts = b.totalSupply();
        shares = type(uint256).max;
        for (uint256 i; i < n; ++i) {
            if (bals[i] == 0) continue;
            // mulDivUp(bal, s, ts) <= got  <=>  s <= got * ts / bal
            uint256 s = FixedPointMathLib.mulDiv(got[i], ts, bals[i]);
            if (s < shares) shares = s;
        }
        if (shares == type(uint256).max) shares = 0;
        if (shares == 0 || shares < minShares) revert InsufficientShares(shares, minShares);

        for (uint256 i; i < n; ++i) {
            uint256 need = FixedPointMathLib.mulDivUp(bals[i], shares, ts);
            if (need != 0) comps[i].safeApprove(basket, need);
        }
        b.issue(shares, msg.sender);
        for (uint256 i; i < n; ++i) {
            comps[i].safeApprove(basket, 0);
            uint256 left = SafeTransferLib.balanceOf(comps[i], address(this));
            if (left != 0) comps[i].safeTransfer(msg.sender, left);
        }
        uint256 usdcLeft = SafeTransferLib.balanceOf(usdc, address(this));
        if (usdcLeft != 0) usdc.safeTransfer(msg.sender, usdcLeft);

        emit Bought(msg.sender, basket, usdcIn, shares);
    }

    /// @notice Redeem `shares` (pulled from msg.sender; approve or permit first), swap every component to USDC and
    ///         send it to msg.sender. Reverts if any component could not be delivered (use in-kind redeem instead).
    function sell(address basket, uint256 shares, uint256[] calldata minOuts, uint256 minUsdc)
        external
        nonReentrant
        returns (uint256 usdcOut)
    {
        if (!factory.isBasket(basket)) revert UnknownBasket();
        if (shares == 0) revert ZeroAmount();
        IBasket b = IBasket(basket);
        (address[] memory comps,) = b.getBundle();
        uint256 n = comps.length;
        if (minOuts.length != n) revert LengthMismatch();

        basket.safeTransferFrom(msg.sender, address(this), shares);
        (uint256[] memory amts, uint256 owedMask) = b.redeem(shares, address(this));
        if (owedMask != 0) revert RedeemIncomplete(owedMask);

        for (uint256 i; i < n; ++i) {
            if (amts[i] == 0) continue;
            IBasketFactory.TokenConfig memory c = factory.tokenConfig(comps[i]);
            usdcOut += SwapLib.swap(c.adapter, c.poolData, comps[i], usdc, amts[i], minOuts[i], msg.sender);
        }
        if (usdcOut < minUsdc) revert InsufficientUsdc(usdcOut, minUsdc);
        emit Sold(msg.sender, basket, shares, usdcOut);
    }

    function _useTransientReentrancyGuardOnlyOnMainnet() internal pure override returns (bool) {
        return false;
    }
}
