// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

import {IBasket} from "./interfaces/IBasket.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {OracleLib} from "./libraries/OracleLib.sol";
import {SwapLib} from "./libraries/SwapLib.sol";

/// @title AlloyRouter
/// @notice Stateless USDC <-> basket router. Users are protected only by their own `minOuts` / `minShares` /
///         `minUsdc`. Every call ends with the router holding zero tokens and zero allowances.
/// @dev Feeds are read (unguarded) only to split USDC by bundle value and to value buy leftovers. Leftovers worth
///      < DUST_USDC are donated to the basket; larger ones are swapped back to USDC (oracle minOut) and refunded,
///      falling back to an in-kind refund if that swap fails.
contract AlloyRouter is ReentrancyGuardTransient {
    using SafeTransferLib for address;

    event Bought(address indexed user, address indexed basket, uint256 usdcIn, uint256 shares);
    event Sold(address indexed user, address indexed basket, uint256 shares, uint256 usdcOut);
    /// @notice Buy leftovers: `usdcRefunded` (incl. swapped-back leftovers), `dustDonated[i]` given to the basket,
    ///         `refundedInKind[i]` returned as tokens (only if the swap-back failed).
    event BuyLeftovers(
        address indexed user,
        address indexed basket,
        uint256 usdcRefunded,
        uint256[] dustDonated,
        uint256[] refundedInKind
    );

    error UnknownBasket();
    error LengthMismatch();
    error InsufficientShares(uint256 shares, uint256 minShares);
    error InsufficientUsdc(uint256 out, uint256 minUsdc);
    error RedeemIncomplete(uint256 owedMask);
    error ZeroAmount();
    error OnlySelf();

    /// @notice Leftovers below $0.05 (USDC 6 dec) are donated to the basket instead of refunded.
    uint256 public constant DUST_USDC = 50_000;

    IBasketFactory public immutable factory;
    address public immutable usdc;

    constructor(address factory_) {
        factory = IBasketFactory(factory_);
        usdc = IBasketFactory(factory_).usdc();
    }

    // ------------------------------------------------------------------ quote helpers (views)
    /// @notice How `buy` splits `usdcIn` across components (proportional to current oracle value of the bundle).
    function splitUsdc(address basket, uint256 usdcIn) public view returns (uint256[] memory slices) {
        uint256[] memory vals = IBasket(basket).componentValues();
        uint256 n = vals.length;
        uint256 totalVal;
        for (uint256 i; i < n; ++i) {
            totalVal += vals[i];
        }
        if (totalVal == 0) revert ZeroAmount();
        slices = new uint256[](n);
        uint256 spent;
        for (uint256 i; i < n; ++i) {
            slices[i] = i == n - 1 ? usdcIn - spent : FixedPointMathLib.mulDiv(usdcIn, vals[i], totalVal);
            spent += slices[i];
        }
    }

    /// @notice Shares `buy` would issue given swap outputs `got[i]` (e.g. from QuoterV2 for each `splitUsdc` slice),
    ///         and the component amounts `issue` would pull. Accounts for the fee accrued first.
    function sharesFor(address basket, uint256[] memory got)
        public
        view
        returns (uint256 shares, uint256[] memory used)
    {
        IBasket b = IBasket(basket);
        (, uint256[] memory bals) = b.getBundle();
        uint256 ts = b.totalSupply() + b.pendingFee();
        (shares, used) = _sharesFor(bals, ts, got);
    }

    // ------------------------------------------------------------------ buy / sell
    /// @notice USDC -> components (split by current bundle value) -> issue max affordable shares to msg.sender.
    ///         Leftovers: dust (< $0.05 each) donated to the basket, the rest swapped back and refunded as USDC.
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

        uint256[] memory got = new uint256[](n);
        {
            uint256[] memory slices = splitUsdc(basket, usdcIn);
            for (uint256 i; i < n; ++i) {
                if (slices[i] == 0) continue;
                IBasketFactory.TokenConfig memory c = factory.tokenConfig(comps[i]);
                got[i] = SwapLib.swap(c.adapter, c.poolData, usdc, comps[i], slices[i], minOuts[i], address(this));
            }
        }

        uint256[] memory need;
        (shares, need) = _sharesFor(bals, b.totalSupply(), got);
        if (shares == 0 || shares < minShares) revert InsufficientShares(shares, minShares);

        for (uint256 i; i < n; ++i) {
            if (need[i] != 0) comps[i].safeApprove(basket, need[i]);
        }
        b.issue(shares, msg.sender);
        for (uint256 i; i < n; ++i) {
            comps[i].safeApprove(basket, 0);
        }
        _settleLeftovers(basket, comps);
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

    /// @dev External so a failing swap-back can be caught (try/catch) and rolled back atomically. Self-only.
    function swapLeftoverToUsdc(address token, uint256 amount, uint256 minOut) external returns (uint256) {
        if (msg.sender != address(this)) revert OnlySelf();
        IBasketFactory.TokenConfig memory c = factory.tokenConfig(token);
        return SwapLib.swap(c.adapter, c.poolData, token, usdc, amount, minOut, address(this));
    }

    // ------------------------------------------------------------------ internals
    function _settleLeftovers(address basket, address[] memory comps) internal {
        uint256 n = comps.length;
        uint256[] memory donated = new uint256[](n);
        uint256[] memory inKind = new uint256[](n);
        uint256 tol = factory.swapTolBps();
        bool any;
        for (uint256 i; i < n; ++i) {
            uint256 left = SafeTransferLib.balanceOf(comps[i], address(this));
            if (left == 0) continue;
            any = true;
            uint256 px = OracleLib.rawPrice(factory.tokenConfig(comps[i]).feed);
            uint256 usd6 = OracleLib.value(left, px) / 100; // 8-dec USD -> 6-dec USDC
            if (usd6 < DUST_USDC) {
                comps[i].safeTransfer(basket, left); // accrues to all holders
                donated[i] = left;
            } else {
                try this.swapLeftoverToUsdc(comps[i], left, usd6 * (10_000 - tol) / 10_000) {}
                catch {
                    comps[i].safeTransfer(msg.sender, left);
                    inKind[i] = left;
                }
            }
        }
        uint256 usdcLeft = SafeTransferLib.balanceOf(usdc, address(this));
        if (usdcLeft != 0) usdc.safeTransfer(msg.sender, usdcLeft);
        if (any || usdcLeft != 0) emit BuyLeftovers(msg.sender, basket, usdcLeft, donated, inKind);
    }

    /// @dev mulDivUp(bal, s, ts) <= got  <=>  s <= got * ts / bal
    function _sharesFor(uint256[] memory bals, uint256 ts, uint256[] memory got)
        internal
        pure
        returns (uint256 shares, uint256[] memory used)
    {
        uint256 n = bals.length;
        if (got.length != n) revert LengthMismatch();
        shares = type(uint256).max;
        for (uint256 i; i < n; ++i) {
            if (bals[i] == 0) continue;
            uint256 s = FixedPointMathLib.mulDiv(got[i], ts, bals[i]);
            if (s < shares) shares = s;
        }
        if (shares == type(uint256).max) shares = 0;
        used = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            used[i] = FixedPointMathLib.mulDivUp(bals[i], shares, ts);
        }
    }

    function _useTransientReentrancyGuardOnlyOnMainnet() internal pure override returns (bool) {
        return false;
    }
}

