// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {MockFeedPauseRegistry} from "../src/MockFeedPauseRegistry.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";
import {IFeedPauseRegistry} from "../src/interfaces/IFeedPauseRegistry.sol";

contract MockPriceFeedTest is Test {
    MockPriceFeed feed;
    MockFeedPauseRegistry registry;
    address owner = makeAddr("owner");
    address bot = makeAddr("bot");
    address rando = makeAddr("rando");

    int256 constant P0 = 152_13559575; // $152.13559575

    function setUp() public {
        vm.warp(1_800_000_000);
        feed = new MockPriceFeed("tNVDAc / USD", owner, P0);
        registry = new MockFeedPauseRegistry(owner);
        vm.startPrank(owner);
        feed.setUpdater(bot, true);
        feed.setUpdater(address(registry), true);
        vm.stopPrank();
    }

    function test_metadata() public view {
        assertEq(feed.decimals(), 8);
        assertEq(feed.description(), "tNVDAc / USD");
        assertEq(feed.version(), 4);
        assertEq(feed.owner(), owner);
    }

    function test_initialRound() public view {
        (uint80 id, int256 a, uint256 s, uint256 u, uint80 air) = feed.latestRoundData();
        assertEq(id, 1);
        assertEq(a, P0);
        assertEq(s, block.timestamp);
        assertEq(u, block.timestamp);
        assertEq(air, 1);
        assertEq(feed.latestAnswer(), P0);
        assertEq(feed.latestTimestamp(), block.timestamp);
    }

    function test_noData_whenNoInitialAnswer() public {
        MockPriceFeed f = new MockPriceFeed("x", owner, 0);
        vm.expectRevert(MockPriceFeed.NoDataPresent.selector);
        f.latestRoundData();
        vm.expectRevert(MockPriceFeed.NoDataPresent.selector);
        f.getRoundData(1);
    }

    function test_roundHistory() public {
        uint256 t1 = block.timestamp;
        vm.warp(t1 + 60);
        vm.prank(bot);
        feed.updateAnswer(160e8);
        vm.warp(t1 + 120);
        vm.prank(owner);
        feed.updateAnswer(150e8);

        (uint80 id, int256 a,, uint256 u,) = feed.latestRoundData();
        assertEq(id, 3);
        assertEq(a, 150e8);
        assertEq(u, t1 + 120);

        (uint80 id1, int256 a1,, uint256 u1, uint80 air1) = feed.getRoundData(1);
        assertEq(id1, 1);
        assertEq(a1, P0);
        assertEq(u1, t1);
        assertEq(air1, 1);
        (, int256 a2,, uint256 u2,) = feed.getRoundData(2);
        assertEq(a2, 160e8);
        assertEq(u2, t1 + 60);

        vm.expectRevert(MockPriceFeed.NoDataPresent.selector);
        feed.getRoundData(4);
        vm.expectRevert(MockPriceFeed.NoDataPresent.selector);
        feed.getRoundData(0);
    }

    function test_onlyUpdater() public {
        vm.prank(rando);
        vm.expectRevert(MockPriceFeed.NotUpdater.selector);
        feed.updateAnswer(1e8);
        vm.prank(rando);
        vm.expectRevert(MockPriceFeed.NotUpdater.selector);
        feed.setPaused(true);
        vm.prank(bot);
        vm.expectRevert(MockPriceFeed.NotOwner.selector);
        feed.setUpdater(rando, true);
    }

    function test_rejectsNonPositive() public {
        vm.startPrank(bot);
        vm.expectRevert(MockPriceFeed.InvalidAnswer.selector);
        feed.updateAnswer(0);
        vm.expectRevert(MockPriceFeed.InvalidAnswer.selector);
        feed.updateAnswer(-1);
        vm.stopPrank();
    }

    function test_staleRound() public {
        uint256 stale = block.timestamp - 26 hours;
        vm.prank(bot);
        feed.updateAnswerAt(P0, stale);
        (uint80 id,,, uint256 u,) = feed.latestRoundData();
        assertEq(id, 2);
        assertEq(u, stale);
        assertGt(block.timestamp - u, 25 hours, "consumer staleness check should trip");

        vm.prank(bot);
        vm.expectRevert(MockPriceFeed.InvalidTimestamp.selector);
        feed.updateAnswerAt(P0, block.timestamp + 1);
    }

    function test_pause_freezesButLooksFresh() public {
        vm.prank(bot);
        feed.setPaused(true);
        assertTrue(feed.paused());

        vm.prank(bot);
        vm.expectRevert(MockPriceFeed.FeedPaused.selector);
        feed.updateAnswer(1e8);
        vm.prank(bot);
        vm.expectRevert(MockPriceFeed.FeedPaused.selector);
        feed.updateAnswerAt(1e8, block.timestamp);

        // Reads still work and updatedAt still looks fresh -> consumers must check the flag separately.
        (, int256 a,, uint256 u,) = feed.latestRoundData();
        assertEq(a, P0);
        assertEq(u, block.timestamp);

        vm.prank(bot);
        feed.setPaused(false);
        vm.prank(bot);
        feed.updateAnswer(1e8);
    }

    function test_registry_pauseRoundTrip() public {
        IFeedPauseRegistry r = IFeedPauseRegistry(address(registry));
        assertFalse(r.isOraclePaused(address(feed)));

        vm.prank(owner);
        registry.setOraclePaused(address(feed), true);
        assertTrue(r.isOraclePaused(address(feed)));
        assertTrue(feed.paused());

        // Pausing directly on the feed is visible through the registry too.
        vm.prank(bot);
        feed.setPaused(false);
        assertFalse(r.isOraclePaused(address(feed)));
    }

    function test_registry_mainnetSetterSelector() public pure {
        // Same selector as the Base-mainnet Chainlink pause registry (0x3f3E8c...5CaD).
        assertEq(MockFeedPauseRegistry.setOraclePaused.selector, bytes4(0x0dd9faaf));
    }

    function test_registry_access() public {
        vm.prank(rando);
        vm.expectRevert(MockFeedPauseRegistry.NotPauser.selector);
        registry.setOraclePaused(address(feed), true);

        vm.prank(owner);
        registry.setPauser(bot, true);
        vm.prank(bot);
        registry.setOraclePaused(address(feed), true);
        assertTrue(feed.paused());
    }

    function test_transferOwnership() public {
        vm.prank(owner);
        feed.transferOwnership(rando);
        assertEq(feed.owner(), rando);
        vm.prank(owner);
        vm.expectRevert(MockPriceFeed.NotOwner.selector);
        feed.setUpdater(owner, true);
    }

    function testFuzz_updates(int256 a, uint8 n) public {
        a = bound(a, 1, type(int128).max);
        n = uint8(bound(n, 1, 20));
        for (uint256 i; i < n; ++i) {
            vm.warp(block.timestamp + 1);
            vm.prank(bot);
            feed.updateAnswer(a + int256(i));
        }
        (uint80 id, int256 last,,,) = AggregatorV3Interface(address(feed)).latestRoundData();
        assertEq(id, n + 1);
        assertEq(last, a + int256(uint256(n)) - 1);
        (, int256 first,,,) = feed.getRoundData(2);
        assertEq(first, a);
    }
}
