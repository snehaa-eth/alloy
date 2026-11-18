// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "solady/auth/Ownable.sol";
import {FeedGuardBase} from "./FeedGuardBase.sol";
import {IFeedPauseRegistry} from "../interfaces/IFeedPauseRegistry.sol";

/// @notice Testnet guard: base checks (non-strict multiplier check) + an owner-controlled per-feed pause flag + an
///         optional pause registry (`MockFeedPauseRegistry.isOraclePaused`). A feed is paused if either says so.
contract SimpleFeedGuard is FeedGuardBase, Ownable {
    event FeedPauseSet(address indexed feed, bool paused);

    address public immutable pauseRegistry; // 0 => skip
    mapping(address feed => bool) public feedPaused;

    constructor(address owner_, uint256 maxAge_, address pauseRegistry_) FeedGuardBase(maxAge_, 1 days, false) {
        _initializeOwner(owner_);
        pauseRegistry = pauseRegistry_;
    }

    function setFeedPaused(address feed, bool p) external onlyOwner {
        feedPaused[feed] = p;
        emit FeedPauseSet(feed, p);
    }

    function _isPaused(address feed) internal view override returns (bool) {
        if (feedPaused[feed]) return true;
        return pauseRegistry != address(0) && IFeedPauseRegistry(pauseRegistry).isOraclePaused(feed);
    }
}
