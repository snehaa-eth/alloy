// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Feed pause registry (pause flag can freeze a feed while `updatedAt` still looks fresh).
/// @dev Testnet: `MockFeedPauseRegistry` in packages/testnet-env exposes exactly this. Mainnet Chainlink registry
///      (0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD): function name UNVERIFIED — if it differs, deploy a shim.
interface IFeedPauseRegistry {
    function isOraclePaused(address feed) external view returns (bool);
}
