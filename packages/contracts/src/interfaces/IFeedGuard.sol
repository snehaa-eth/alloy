// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Pluggable price-health check used to guard rebalances.
/// @dev Implementations MUST revert when the feed (or the token's corporate-action state) is not safe to trade on.
interface IFeedGuard {
    /// @return price 8-decimal USD price per raw (8-decimal) token unit, already including the token multiplier.
    function checkedPrice(address token, address feed) external view returns (uint256 price);
}
