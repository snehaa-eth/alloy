// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FeedGuardBase} from "./FeedGuardBase.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";
import {IFeedPauseRegistry} from "../interfaces/IFeedPauseRegistry.sol";

/// @notice Mainnet guard: base checks + Chainlink pause registry + L2 sequencer-uptime feed with grace period.
/// @dev Multiplier check is always STRICT: verified on Base mainnet (NVDAc) that ERC-8056 `effectiveAt()` exists,
///      so a token that cannot answer it fails closed.
contract ChainlinkFeedGuard is FeedGuardBase {
    error SequencerDown();
    error SequencerGracePeriod();

    address public immutable pauseRegistry; // 0 => skip
    address public immutable sequencerFeed; // 0 => skip
    uint256 public immutable gracePeriod;

    constructor(
        address pauseRegistry_,
        address sequencerFeed_,
        uint256 gracePeriod_,
        uint256 maxAge_,
        uint256 multiplierWindow_
    ) FeedGuardBase(maxAge_, multiplierWindow_, true) {
        pauseRegistry = pauseRegistry_;
        sequencerFeed = sequencerFeed_;
        gracePeriod = gracePeriod_;
    }

    function _preChecks(address) internal view override {
        if (sequencerFeed == address(0)) return;
        (, int256 answer, uint256 startedAt,,) = IAggregatorV3(sequencerFeed).latestRoundData();
        if (answer != 0) revert SequencerDown(); // 0 = up, 1 = down
        if (block.timestamp - startedAt <= gracePeriod) revert SequencerGracePeriod();
    }

    function _isPaused(address feed) internal view override returns (bool) {
        if (pauseRegistry == address(0)) return false;
        return IFeedPauseRegistry(pauseRegistry).isOraclePaused(feed);
    }
}
