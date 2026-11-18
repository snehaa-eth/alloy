// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeedGuard} from "../interfaces/IFeedGuard.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

/// @notice Shared checks: answer > 0, updatedAt not older than `maxAge` (and not in the future), and no B20
///         multiplier change pending within +-`multiplierWindow` (ERC-8056 `effectiveAt()`).
/// @dev If the token does not answer `effectiveAt()` (non-B20, or a precompile version without ERC-8056 views),
///      the check fails closed when `strictMultiplier` is set and is skipped otherwise.
abstract contract FeedGuardBase is IFeedGuard {
    error BadAnswer(address feed);
    error StaleFeed(address feed, uint256 updatedAt);
    error FeedPaused(address feed);
    error MultiplierChangePending(address token, uint256 effectiveAt);
    error MultiplierStateUnknown(address token);

    uint256 public immutable maxAge;
    uint256 public immutable multiplierWindow;
    bool public immutable strictMultiplier;

    constructor(uint256 maxAge_, uint256 multiplierWindow_, bool strictMultiplier_) {
        maxAge = maxAge_;
        multiplierWindow = multiplierWindow_;
        strictMultiplier = strictMultiplier_;
    }

    /// @inheritdoc IFeedGuard
    function checkedPrice(address token, address feed) external view virtual returns (uint256) {
        _preChecks(feed);
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        if (answer <= 0) revert BadAnswer(feed);
        if (updatedAt > block.timestamp || block.timestamp - updatedAt > maxAge) revert StaleFeed(feed, updatedAt);
        if (_isPaused(feed)) revert FeedPaused(feed);
        _checkMultiplier(token);
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(answer); // answer > 0 checked above
    }

    function _preChecks(address feed) internal view virtual {}

    function _isPaused(address feed) internal view virtual returns (bool);

    function _checkMultiplier(address token) internal view {
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeWithSignature("effectiveAt()"));
        if (!ok || ret.length != 32) {
            if (strictMultiplier) revert MultiplierStateUnknown(token);
            return;
        }
        uint256 eff = abi.decode(ret, (uint256));
        if (eff == 0) return;
        if (block.timestamp + multiplierWindow >= eff && block.timestamp <= eff + multiplierWindow) {
            revert MultiplierChangePending(token, eff);
        }
    }
}
