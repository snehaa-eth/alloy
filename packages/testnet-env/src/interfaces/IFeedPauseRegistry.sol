// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal "is this feed paused?" registry surface that Alloy's pluggable feed guard reads.
/// @dev The Base-mainnet Chainlink pause registry (0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD) exposes
///      `setOraclePaused(address,bool)` (selector 0x0dd9faaf) and `getOracleParams(address)` (0xd4197e82, return
///      shape unverified). We mirror the setter selector exactly and add an explicit boolean getter; Alloy should wrap
///      the real registry behind an adapter that implements `isOraclePaused`.
interface IFeedPauseRegistry {
    function isOraclePaused(address feed) external view returns (bool);
}
