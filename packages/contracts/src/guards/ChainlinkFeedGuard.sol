// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FeedGuardBase} from "./FeedGuardBase.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

/// @notice Chainlink pause registry. UNVERIFIED: the exact function name on
///         0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD must be confirmed on a Base fork before mainnet
///         (ARCHITECTURE §1). If it differs, deploy a tiny shim implementing this interface.
interface IFeedPauseRegistry {
    function isPaused(address feed) external view returns (bool);
}

/// @notice Mainnet guard: base checks + Chainlink pause registry + L2 sequencer-uptime feed with grace period.
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
        uint256 multiplierWindow_,
        bool strictMultiplier_
    ) FeedGuardBase(maxAge_, multiplierWindow_, strictMultiplier_) {
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
        return IFeedPauseRegistry(pauseRegistry).isPaused(feed);
    }
}
