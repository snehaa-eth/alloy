// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "solady/auth/Ownable.sol";
import {FeedGuardBase} from "./FeedGuardBase.sol";

/// @notice Testnet guard: base checks + an owner-controlled per-feed pause flag (stands in for the Chainlink
///         registry pause flag / market-closed state).
contract SimpleFeedGuard is FeedGuardBase, Ownable {
    event FeedPauseSet(address indexed feed, bool paused);

    mapping(address feed => bool) public feedPaused;

    constructor(address owner_, uint256 maxAge_) FeedGuardBase(maxAge_, 1 days, false) {
        _initializeOwner(owner_);
    }

    function setFeedPaused(address feed, bool p) external onlyOwner {
        feedPaused[feed] = p;
        emit FeedPauseSet(feed, p);
    }

    function _isPaused(address feed) internal view override returns (bool) {
        return feedPaused[feed];
    }
}
