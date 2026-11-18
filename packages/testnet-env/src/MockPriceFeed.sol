// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

/// @title MockPriceFeed
/// @notice Chainlink AggregatorV3-compatible price feed for the Alloy Base Sepolia testnet world.
///         Stands in for the Base-mainnet Chainlink feeds of Coinbase tokenized stocks.
/// @dev Semantics mirror the real feeds (ARCHITECTURE §1):
///      - 8 decimals; `answer` is USD per RAW token (underlying price x multiplier). Never re-apply the multiplier.
///      - Every update creates a new round with real, queryable history (`getRoundData`).
///      - `paused` models the Chainlink registry pause flag: while paused the feed is frozen (updates revert) but
///        `latestRoundData().updatedAt` keeps looking fresh, so consumers MUST check the pause flag separately.
contract MockPriceFeed is AggregatorV3Interface {
    struct Round {
        int256 answer;
        uint64 startedAt;
        uint64 updatedAt;
    }

    uint8 public constant override decimals = 8;
    uint256 public constant override version = 4;

    string public override description;
    address public owner;
    mapping(address => bool) public isUpdater;
    bool public paused;

    uint80 public latestRound;
    mapping(uint80 => Round) internal _rounds;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);
    event NewRound(uint256 indexed roundId, address indexed startedBy, uint256 startedAt);
    event UpdaterSet(address indexed updater, bool allowed);
    event PausedSet(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotUpdater();
    error FeedPaused();
    error InvalidAnswer();
    error InvalidTimestamp();
    error NoDataPresent();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyUpdater() {
        if (msg.sender != owner && !isUpdater[msg.sender]) revert NotUpdater();
        _;
    }

    constructor(string memory description_, address owner_, int256 initialAnswer) {
        description = description_;
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
        if (initialAnswer != 0) _push(initialAnswer, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                              CHAINLINK READS
    //////////////////////////////////////////////////////////////*/

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        uint80 id = latestRound;
        if (id == 0) revert NoDataPresent();
        Round memory r = _rounds[id];
        return (id, r.answer, r.startedAt, r.updatedAt, id);
    }

    function getRoundData(uint80 roundId) external view override returns (uint80, int256, uint256, uint256, uint80) {
        if (roundId == 0 || roundId > latestRound) revert NoDataPresent();
        Round memory r = _rounds[roundId];
        return (roundId, r.answer, r.startedAt, r.updatedAt, roundId);
    }

    /// @notice Legacy AggregatorInterface reads (some tooling still uses them).
    function latestAnswer() external view returns (int256) {
        return _rounds[latestRound].answer;
    }

    function latestTimestamp() external view returns (uint256) {
        return _rounds[latestRound].updatedAt;
    }

    /*//////////////////////////////////////////////////////////////
                                  WRITES
    //////////////////////////////////////////////////////////////*/

    /// @notice Push a new round at `block.timestamp`.
    function updateAnswer(int256 answer) external onlyUpdater {
        if (paused) revert FeedPaused();
        _push(answer, block.timestamp);
    }

    /// @notice Push a new round with an explicit `updatedAt` (must be <= now). Test affordance: lets demos and tests
    ///         create a deliberately STALE feed (e.g. `updatedAt = now - 26h`). Unlike real Chainlink, `updatedAt`
    ///         may therefore go backwards between rounds; round ids are still strictly increasing.
    function updateAnswerAt(int256 answer, uint256 updatedAt) external onlyUpdater {
        if (paused) revert FeedPaused();
        if (updatedAt > block.timestamp || updatedAt == 0) revert InvalidTimestamp();
        _push(answer, updatedAt);
    }

    /// @notice Freeze / unfreeze the feed. Mirrors the Chainlink registry pause flag.
    function setPaused(bool paused_) external onlyUpdater {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function setUpdater(address updater, bool allowed) external onlyOwner {
        isUpdater[updater] = allowed;
        emit UpdaterSet(updater, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _push(int256 answer, uint256 ts) internal {
        if (answer <= 0) revert InvalidAnswer();
        uint80 id = latestRound + 1;
        latestRound = id;
        _rounds[id] = Round({answer: answer, startedAt: uint64(ts), updatedAt: uint64(ts)});
        emit NewRound(id, msg.sender, ts);
        emit AnswerUpdated(answer, id, ts);
    }
}
