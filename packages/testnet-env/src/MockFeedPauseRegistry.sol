// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFeedPauseRegistry} from "./interfaces/IFeedPauseRegistry.sol";
import {MockPriceFeed} from "./MockPriceFeed.sol";

/// @title MockFeedPauseRegistry
/// @notice Registry-style view over the `paused` flag of MockPriceFeeds, standing in for the Base-mainnet Chainlink
///         pause registry. Alloy's feed guard reads `isOraclePaused(feed)`; demos flip it with
///         `setOraclePaused(feed, bool)` (same selector as mainnet: 0x0dd9faaf).
/// @dev The flag lives on the feed itself, so pausing through the registry or directly on the feed is equivalent.
///      The registry must be an updater on each feed for `setOraclePaused` to work (the deploy script sets this).
contract MockFeedPauseRegistry is IFeedPauseRegistry {
    address public owner;
    mapping(address => bool) public isPauser;

    event OraclePausedSet(address indexed feed, bool paused);
    event PauserSet(address indexed pauser, bool allowed);

    error NotOwner();
    error NotPauser();

    constructor(address owner_) {
        owner = owner_;
    }

    function isOraclePaused(address feed) external view returns (bool) {
        return MockPriceFeed(feed).paused();
    }

    function setOraclePaused(address feed, bool paused_) external {
        if (msg.sender != owner && !isPauser[msg.sender]) revert NotPauser();
        MockPriceFeed(feed).setPaused(paused_);
        emit OraclePausedSet(feed, paused_);
    }

    function setPauser(address pauser, bool allowed) external {
        if (msg.sender != owner) revert NotOwner();
        isPauser[pauser] = allowed;
        emit PauserSet(pauser, allowed);
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        owner = newOwner;
    }
}
