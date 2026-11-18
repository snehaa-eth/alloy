// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {FeedGuardBase} from "../src/guards/FeedGuardBase.sol";
import {ChainlinkFeedGuard} from "../src/guards/ChainlinkFeedGuard.sol";
import {IFeedPauseRegistry} from "../src/interfaces/IFeedPauseRegistry.sol";
import {SimpleFeedGuard} from "../src/guards/SimpleFeedGuard.sol";
import {MockV3Aggregator} from "./utils/MockV3Aggregator.sol";
import {Ownable} from "solady/auth/Ownable.sol";

contract GuardsTest is Fixture {
    function test_simple_ok_and_pause() public {
        assertEq(guard.checkedPrice(address(stocks[0]), address(feeds[0])), 100e8);
        vm.expectRevert(Ownable.Unauthorized.selector);
        guard.setFeedPaused(address(feeds[0]), true);
        vm.prank(owner);
        guard.setFeedPaused(address(feeds[0]), true);
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.FeedPaused.selector, address(feeds[0])));
        guard.checkedPrice(address(stocks[0]), address(feeds[0]));
    }

    function test_staleness_boundary() public {
        vm.warp(block.timestamp + 25 hours);
        assertEq(guard.checkedPrice(address(stocks[0]), address(feeds[0])), 100e8); // exactly 25h: ok
        vm.warp(block.timestamp + 1);
        vm.expectPartialRevert(FeedGuardBase.StaleFeed.selector);
        guard.checkedPrice(address(stocks[0]), address(feeds[0]));
    }

    function test_chainlink_sequencer() public {
        MockV3Aggregator seq = new MockV3Aggregator(0, 0);
        ChainlinkFeedGuard cg = new ChainlinkFeedGuard(address(0), address(seq), 1 hours, 25 hours, 1 days);
        _mockNoPendingMultiplier();
        vm.expectRevert(ChainlinkFeedGuard.SequencerGracePeriod.selector);
        cg.checkedPrice(address(stocks[0]), address(feeds[0]));
        vm.warp(block.timestamp + 1 hours + 1);
        _refreshFeeds();
        assertEq(cg.checkedPrice(address(stocks[0]), address(feeds[0])), 100e8);
        seq.set(1); // down
        vm.expectRevert(ChainlinkFeedGuard.SequencerDown.selector);
        cg.checkedPrice(address(stocks[0]), address(feeds[0]));
    }

    function test_chainlink_pauseRegistry() public {
        address reg = makeAddr("registry");
        ChainlinkFeedGuard cg = new ChainlinkFeedGuard(reg, address(0), 0, 25 hours, 1 days);
        _mockNoPendingMultiplier();
        vm.mockCall(reg, abi.encodeCall(IFeedPauseRegistry.isOraclePaused, (address(feeds[0]))), abi.encode(false));
        assertEq(cg.checkedPrice(address(stocks[0]), address(feeds[0])), 100e8);
        // paused while updatedAt still looks fresh
        vm.mockCall(reg, abi.encodeCall(IFeedPauseRegistry.isOraclePaused, (address(feeds[0]))), abi.encode(true));
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.FeedPaused.selector, address(feeds[0])));
        cg.checkedPrice(address(stocks[0]), address(feeds[0]));
    }

    function test_simple_readsPauseRegistry() public {
        address reg = makeAddr("mockRegistry");
        SimpleFeedGuard sg = new SimpleFeedGuard(owner, 25 hours, reg);
        assertFalse(sg.strictMultiplier());
        vm.mockCall(reg, abi.encodeCall(IFeedPauseRegistry.isOraclePaused, (address(feeds[0]))), abi.encode(false));
        assertEq(sg.checkedPrice(address(stocks[0]), address(feeds[0])), 100e8); // non-strict: unknown multiplier ok
        vm.mockCall(reg, abi.encodeCall(IFeedPauseRegistry.isOraclePaused, (address(feeds[0]))), abi.encode(true));
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.FeedPaused.selector, address(feeds[0])));
        sg.checkedPrice(address(stocks[0]), address(feeds[0]));
    }

    function test_multiplierWindow_edges() public {
        ChainlinkFeedGuard cg = new ChainlinkFeedGuard(address(0), address(0), 0, 25 hours, 1 days);
        assertTrue(cg.strictMultiplier());
        address t = address(stocks[0]);
        vm.mockCall(t, abi.encodeWithSignature("effectiveAt()"), abi.encode(uint256(0)));
        assertEq(cg.checkedPrice(t, address(feeds[0])), 100e8); // none pending
        vm.mockCall(t, abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp + 1 days + 1));
        assertEq(cg.checkedPrice(t, address(feeds[0])), 100e8);
        vm.mockCall(t, abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp + 1 days));
        vm.expectPartialRevert(FeedGuardBase.MultiplierChangePending.selector);
        cg.checkedPrice(t, address(feeds[0]));
        vm.mockCall(t, abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp - 1 days));
        vm.expectPartialRevert(FeedGuardBase.MultiplierChangePending.selector);
        cg.checkedPrice(t, address(feeds[0]));
        vm.mockCall(t, abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp - 1 days - 1));
        assertEq(cg.checkedPrice(t, address(feeds[0])), 100e8);
    }
}
