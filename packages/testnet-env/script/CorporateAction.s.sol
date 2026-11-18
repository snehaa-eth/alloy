// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";

import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {MockFeedPauseRegistry} from "../src/MockFeedPauseRegistry.sol";

/// @title CorporateAction
/// @notice Demo stock split / reverse split on an Alloy test stock, with the matching feed handling.
///
/// Semantics (ARCHITECTURE §1): raw `balanceOf` never changes; the B20 multiplier scales the *displayed* amount.
/// A 2:1 split doubles the multiplier and halves the per-share price, so the feed's answer — USD per RAW token
/// (= underlying price x multiplier) — is UNCHANGED. What changes for the feed is availability: Chainlink freezes
/// feeds around corporate actions, so we PAUSE the feed while the action is pending and push a fresh round after.
///
/// Env:
///   SYMBOL        test stock, e.g. tTSLAc                         (required)
///   ACTION        schedule | execute | immediate                  (default immediate)
///                 schedule : pause feed + updateUIMultiplier(new, now + DELAY)   [Cobalt; falls back to pause only]
///                 execute  : (after effectiveAt) [fallback: updateMultiplier(new)] + unpause + fresh round
///                 immediate: updateMultiplier(new) + fresh round, no pause window
///   RATIO_NUM / RATIO_DEN   new multiplier = current * NUM / DEN (default 2/1 = 2-for-1 split; 1/10 = 1:10 reverse)
///   DELAY_SECONDS default 600 (schedule only)
///   NEW_ANSWER    optional 8-dec feed answer to push on execute/immediate (default: keep current per-raw price)
///   DEPLOYMENTS   default deployments/<chainId>.json
///   DEPLOYER_PK   signer (or --sender/--unlocked); must hold OPERATOR_ROLE on the token and own the registry/feed
///
/// NOTE: Base Foundry v1.1.0 (base-forge / base-anvil) only implements the pre-Cobalt multiplier surface
/// (`multiplier`, `updateMultiplier`). Base Sepolia and mainnet run Cobalt (`uiMultiplier`, `updateUIMultiplier`,
/// `newUIMultiplier`, `effectiveAt`). This script feature-detects and falls back, so it runs in both worlds.
contract CorporateAction is Script {
    IB20Asset internal token;
    MockPriceFeed internal feed;
    MockFeedPauseRegistry internal registry;

    function run() external {
        string memory symbol = vm.envString("SYMBOL");
        string memory action = vm.envOr("ACTION", string("immediate"));
        uint256 num = vm.envOr("RATIO_NUM", uint256(2));
        uint256 den = vm.envOr("RATIO_DEN", uint256(1));
        require(num > 0 && den > 0, "bad ratio");

        string memory path =
            vm.envOr("DEPLOYMENTS", string.concat("deployments/", vm.toString(block.chainid), ".json"));
        string memory json = vm.readFile(path);
        token = IB20Asset(vm.parseJsonAddress(json, string.concat(".stocks.", symbol, ".token")));
        feed = MockPriceFeed(vm.parseJsonAddress(json, string.concat(".stocks.", symbol, ".feed")));
        registry = MockFeedPauseRegistry(vm.parseJsonAddress(json, ".feedPauseRegistry"));

        bool cobalt = supportsScheduledMultiplier(address(token));
        uint256 cur = cobalt ? token.uiMultiplier() : token.multiplier();
        uint256 next = cur * num / den;
        (, int256 answer,,,) = feed.latestRoundData();
        int256 newAnswer = int256(vm.envOr("NEW_ANSWER", uint256(answer)));

        console2.log("token", address(token), symbol);
        console2.log("cobalt (scheduled multiplier) supported:", cobalt);
        console2.log("multiplier now (WAD)", cur);
        console2.log("multiplier new (WAD)", next);

        uint256 pk = vm.envOr("DEPLOYER_PK", uint256(0));
        if (pk != 0) vm.startBroadcast(pk);
        else vm.startBroadcast();

        bytes32 a = keccak256(bytes(action));
        if (a == keccak256("schedule")) {
            uint256 effectiveAt = block.timestamp + vm.envOr("DELAY_SECONDS", uint256(600));
            if (cobalt) {
                token.updateUIMultiplier(next, effectiveAt);
                console2.log("scheduled updateUIMultiplier; effectiveAt", effectiveAt);
            } else {
                console2.log("no scheduled multiplier on this chain; run ACTION=execute after", effectiveAt);
            }
            if (!feed.paused()) registry.setOraclePaused(address(feed), true);
            console2.log("feed paused for the corporate-action window");
        } else if (a == keccak256("execute")) {
            if (cobalt) {
                uint256 at = token.effectiveAt();
                require(block.timestamp >= at, "corporate action not effective yet");
                console2.log("uiMultiplier is now", token.uiMultiplier());
            } else {
                token.updateMultiplier(next);
                console2.log("updateMultiplier applied", next);
            }
            if (feed.paused()) registry.setOraclePaused(address(feed), false);
            feed.updateAnswer(newAnswer);
            console2.log("feed unpaused, fresh round pushed", uint256(newAnswer));
        } else if (a == keccak256("immediate")) {
            token.updateMultiplier(next);
            if (feed.paused()) registry.setOraclePaused(address(feed), false);
            feed.updateAnswer(newAnswer);
            console2.log("updateMultiplier applied + fresh round", next, uint256(newAnswer));
        } else {
            revert("ACTION must be schedule|execute|immediate");
        }
        vm.stopBroadcast();
    }

    /// @notice True if the token exposes the Cobalt / ERC-8056 `uiMultiplier()` surface.
    function supportsScheduledMultiplier(address t) public view returns (bool) {
        (bool ok, bytes memory ret) = t.staticcall(abi.encodeWithSignature("uiMultiplier()"));
        return ok && ret.length == 32;
    }
}
