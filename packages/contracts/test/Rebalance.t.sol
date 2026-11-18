// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {Basket} from "../src/Basket.sol";
import {IBasket} from "../src/interfaces/IBasket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {FeedGuardBase} from "../src/guards/FeedGuardBase.sol";
import {ChainlinkFeedGuard} from "../src/guards/ChainlinkFeedGuard.sol";
import {SwapLib} from "../src/libraries/SwapLib.sol";
import {ReentrantAdapter} from "./utils/MockSwapAdapter.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

contract RebalanceTest is Fixture {
    Basket internal b;

    function setUp() public override {
        super.setUp();
        b = _create(creator, _params3(), 1000e6); // 40/30/30, AAA $100 BBB $50 CCC $200
    }

    function _drift() internal {
        _setPrice(0, 150e8); // AAA 600, BBB 300, CCC 300 -> 50/25/25
    }

    // ------------------------------------------------------------------ happy path
    function test_trim_toBandEdge() public {
        _drift();
        uint256 ts = b.totalSupply();
        vm.expectEmit(address(b));
        emit IBasket.Rebalanced(1200e8, 1200e8, 0, keeper);
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.4e8)); // sell $60 AAA -> BBB
        uint256[] memory w = _weightsBps(b);
        assertEq(w[0], 4500);
        assertEq(w[1], 3000);
        assertEq(w[2], 2500);
        assertEq(b.totalSupply(), ts);
        assertEq(b.lastRebalance(), block.timestamp);
        // exact approvals reset
        assertEq(stocks[0].allowance(address(b), address(adapter)), 0);
        assertEq(usdc.allowance(address(b), address(adapter)), 0);
        assertEq(usdc.balanceOf(address(b)), 0);
    }

    function test_onlyKeeperCanRebalance_notCreator() public {
        _drift();
        vm.prank(asha);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.executeRebalance(_trade(0, 1, 0.4e8));
        vm.prank(creator);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.executeRebalance(_trade(0, 1, 0.4e8));
        vm.prank(creator);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.removeComponent(0);
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function test_creatorCannotExecuteDueRecipe_keeperCan() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 2500;
        w[2] = 2500;
        vm.prank(creator);
        b.proposeRecipe(w, keccak256("r"));
        _warp(24 hours);
        IBasket.Trade[] memory t = new IBasket.Trade[](2);
        t[0] = IBasket.Trade({from: 1, to: 0, amountIn: 1e8});
        t[1] = IBasket.Trade({from: 2, to: 0, amountIn: 0.25e8});
        vm.prank(creator);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.executeRebalance(t);
        vm.prank(keeper);
        b.executeRebalance(t);
        assertEq(b.targets()[0], 5000);
    }

    function test_cooldown_oncePerDay() public {
        _drift();
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.4e8));
        vm.warp(block.timestamp + 1 days - 1);
        _refreshFeeds();
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.RebalanceCooldown.selector, block.timestamp + 1));
        b.executeRebalance(new IBasket.Trade[](0));
        vm.warp(block.timestamp + 1);
        vm.prank(keeper);
        b.executeRebalance(new IBasket.Trade[](0));
    }

    function test_globalPause_blocksRebalance() public {
        vm.prank(owner);
        factory.setPaused(true);
        vm.prank(keeper);
        vm.expectRevert(Basket.ProtocolPaused.selector);
        b.executeRebalance(new IBasket.Trade[](0));
    }

    function test_invalidTrades() public {
        _drift();
        vm.startPrank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.InvalidTrade.selector, 0));
        b.executeRebalance(_trade(0, 0, 1e6));
        vm.expectRevert(abi.encodeWithSelector(Basket.InvalidTrade.selector, 0));
        b.executeRebalance(_trade(0, 3, 1e6));
        vm.expectRevert(abi.encodeWithSelector(Basket.InvalidTrade.selector, 0));
        b.executeRebalance(_trade(0, 1, 0));
        vm.expectRevert(abi.encodeWithSelector(Basket.InvalidTrade.selector, 0));
        b.executeRebalance(_trade(0, 1, 4e8 + 1));
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ feed guards
    function test_staleFeed_reverts() public {
        _drift();
        vm.warp(block.timestamp + 25 hours + 1);
        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(FeedGuardBase.StaleFeed.selector, address(feeds[0]), block.timestamp - 25 hours - 1)
        );
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function test_futureTimestamp_reverts() public {
        feeds[1].setWithTimestamp(50e8, block.timestamp + 1);
        vm.prank(keeper);
        vm.expectRevert();
        b.executeRebalance(new IBasket.Trade[](0));
    }

    function test_pausedFeed_reverts() public {
        _drift();
        vm.prank(owner);
        guard.setFeedPaused(address(feeds[2]), true);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.FeedPaused.selector, address(feeds[2])));
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function test_nonPositiveAnswer_reverts() public {
        _setPrice(1, -1);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.BadAnswer.selector, address(feeds[1])));
        b.executeRebalance(new IBasket.Trade[](0));
    }

    function test_pendingMultiplier_reverts_chainlinkGuard() public {
        ChainlinkFeedGuard cg = new ChainlinkFeedGuard(address(0), address(0), 0, 25 hours, 1 days);
        _mockNoPendingMultiplier();
        vm.prank(owner);
        factory.setFeedGuard(address(cg));
        _drift();
        // ERC-8056 view not served by base-forge v1.1.0 precompile -> mock it.
        uint256 eff = block.timestamp + 12 hours;
        vm.mockCall(address(stocks[1]), abi.encodeWithSignature("effectiveAt()"), abi.encode(eff));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.MultiplierChangePending.selector, address(stocks[1]), eff));
        b.executeRebalance(_trade(0, 1, 0.4e8));
        // just after it became effective: still inside the +-1 day window
        vm.mockCall(address(stocks[1]), abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp - 1));
        vm.prank(keeper);
        vm.expectRevert();
        b.executeRebalance(_trade(0, 1, 0.4e8));
        // outside the window -> ok
        vm.mockCall(address(stocks[1]), abi.encodeWithSignature("effectiveAt()"), abi.encode(block.timestamp + 3 days));
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function test_strictMultiplier_failsClosedWhenUnknown() public {
        ChainlinkFeedGuard cg = new ChainlinkFeedGuard(address(0), address(0), 0, 25 hours, 1 days);
        vm.prank(owner);
        factory.setFeedGuard(address(cg));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(FeedGuardBase.MultiplierStateUnknown.selector, address(stocks[0])));
        b.executeRebalance(new IBasket.Trade[](0));
    }

    // ------------------------------------------------------------------ loss caps
    function test_perTxLossCap() public {
        vm.prank(owner);
        factory.setSwapTolBps(500);
        adapter.setSlippage(400); // 4% per hop
        _drift();
        vm.prank(keeper);
        vm.expectPartialRevert(Basket.LossTooHigh.selector); // $300 traded at ~7.84% -> ~196 bps of $1200
        b.executeRebalance(_trade(0, 1, 2e8));
    }

    function test_oracleMinOut_rejectsBadFill() public {
        adapter.setSlippage(150); // worse than the 1% tolerance
        _drift();
        vm.prank(keeper);
        vm.expectRevert("MockSwapAdapter: minOut");
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function _wideBasket() internal returns (Basket w) {
        IBasketFactory.BasketParams memory p = _params2(0);
        p.absBandBps = 10_000;
        p.relBandBps = 10_000;
        p.salt = bytes32("wide");
        w = _create(creator, p, 1000e6); // AAA 5e8 ($500), BBB 10e8 ($500)
    }

    function test_weeklyBudget_decaysAndCaps() public {
        Basket w = _wideBasket();
        vm.prank(owner);
        factory.setSwapTolBps(500);
        adapter.setSlippage(300); // ~5.91% per round trip -> ~118 bps of NAV on a $200 trade
        vm.prank(keeper);
        w.executeRebalance(_trade(0, 1, 2e8));
        uint256 u0 = w.lossBudgetUsed();
        assertApproxEqAbs(u0, 118e14, 2e14);

        _warp(1 days);
        vm.prank(keeper);
        w.executeRebalance(_trade(1, 0, 4e8));
        uint256 u1 = w.lossBudgetUsed();
        assertGt(u1, u0);

        _warp(1 days);
        vm.prank(keeper);
        w.executeRebalance(_trade(0, 1, 2e8));
        uint256 u2 = w.lossBudgetUsed();
        assertLe(u2, 300e14);

        _warp(1 days);
        vm.prank(keeper);
        vm.expectPartialRevert(Basket.WeeklyBudgetExceeded.selector);
        w.executeRebalance(_trade(1, 0, 4e8));

        // a gain never refills: after a profitable trade, used == decayed value
        adapter.setSlippage(-100);
        uint256 before = w.lossBudgetUsed();
        vm.prank(keeper);
        w.executeRebalance(_trade(1, 0, 1e8));
        assertEq(w.lossBudgetUsed(), before);
        assertLe(w.lossBudgetUsed(), 300e14);
    }

    // ------------------------------------------------------------------ band rule
    function test_band_crossingTarget_reverts() public {
        _drift(); // AAA 50% (target 40)
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.BandViolation.selector, 0));
        b.executeRebalance(_trade(0, 2, 0.96e8)); // sells $144 -> AAA 38%
    }

    function test_band_outOfBandNotFixed_reverts() public {
        _drift();
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.BandViolation.selector, 0));
        b.executeRebalance(_trade(0, 1, 1e6));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.BandViolation.selector, 0));
        b.executeRebalance(new IBasket.Trade[](0));
    }

    function test_band_inBandMustStayInBand() public {
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.BandViolation.selector, 0));
        b.executeRebalance(_trade(0, 1, 1e8)); // AAA 40% -> 30%
    }

    function test_band_inBandSmallChurnAllowed() public {
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.2e8)); // AAA 40 -> 38, BBB 30 -> 32
    }

    function test_bandOf() public view {
        assertEq(b.bandOf(4000), 500e14); // min(5%, 25% * 40%) = 5%
        assertEq(b.bandOf(1000), 250e14); // min(5%, 2.5%)
        assertEq(b.bandOf(0), 0);
    }

    function test_letWinnersRun_onlyCapTrims() public {
        IBasketFactory.BasketParams memory p = _params3();
        p.absBandBps = 10_000;
        p.relBandBps = 10_000;
        p.capBps = 4000;
        p.salt = bytes32("lwr");
        Basket l = _create(creator, p, 1000e6);
        assertEq(l.bandOf(3000), type(uint256).max);
        _setPrice(1, 80e8); // BBB rallies: 400/480/300 -> BBB 40.68% > cap
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(Basket.BandViolation.selector, 1));
        l.executeRebalance(new IBasket.Trade[](0));
        // trim BBB to <= 40%: sell 0.2 BBB ($16) into CCC -> BBB 464/1180 = 39.3%
        vm.prank(keeper);
        l.executeRebalance(_trade(1, 2, 0.2e8));
        assertLe(_weightsBps(l)[1], 4000);
    }

    // ------------------------------------------------------------------ recipe change
    function test_recipe_proposeValidation() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 2500;
        w[2] = 2500;
        vm.prank(keeper);
        vm.expectRevert(Basket.NotCreator.selector);
        b.proposeRecipe(w, bytes32("r"));
        w[2] = 2400;
        vm.prank(creator);
        vm.expectRevert(Basket.InvalidWeights.selector);
        b.proposeRecipe(w, bytes32("r"));
        uint16[] memory w2 = new uint16[](2);
        w2[0] = 5000;
        w2[1] = 5000;
        vm.prank(creator);
        vm.expectRevert(Basket.InvalidWeights.selector);
        b.proposeRecipe(w2, bytes32("r"));
        vm.prank(creator);
        vm.expectRevert(Basket.NoPendingRecipe.selector);
        b.cancelRecipe();
    }

    function test_recipe_noticeThenExecute() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 2500;
        w[2] = 2500;
        vm.expectEmit(address(b));
        emit IBasket.RecipeProposed(w, uint64(block.timestamp + 24 hours), keccak256("trim tsla"));
        vm.prank(creator);
        b.proposeRecipe(w, keccak256("trim tsla"));
        (, uint64 at,) = b.pendingRecipe();
        assertEq(at, block.timestamp + 24 hours);

        IBasket.Trade[] memory t = new IBasket.Trade[](2);
        t[0] = IBasket.Trade({from: 1, to: 0, amountIn: 1e8}); // $50 BBB -> AAA
        t[1] = IBasket.Trade({from: 2, to: 0, amountIn: 0.25e8}); // $50 CCC -> AAA

        // before notice: old target applies -> BBB/CCC crossing out of band
        _warp(24 hours - 1);
        vm.prank(keeper);
        vm.expectRevert();
        b.executeRebalance(t);

        _warp(1);
        vm.expectEmit(address(b));
        emit IBasket.RecipeExecuted(w);
        vm.prank(keeper);
        b.executeRebalance(t);
        uint16[] memory tg = b.targets();
        assertEq(tg[0], 5000);
        assertEq(tg[1], 2500);
        (, uint64 at2,) = b.pendingRecipe();
        assertEq(at2, 0);
        uint256[] memory wt = _weightsBps(b);
        assertEq(wt[0], 5000);
        assertEq(wt[1], 2500);
        assertEq(wt[2], 2500);
    }

    function test_recipe_cancel() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 2500;
        w[2] = 2500;
        vm.startPrank(creator);
        b.proposeRecipe(w, bytes32("r"));
        vm.expectEmit(address(b));
        emit IBasket.RecipeCancelled();
        b.cancelRecipe();
        vm.stopPrank();
        _warp(2 days);
        vm.prank(keeper);
        b.executeRebalance(new IBasket.Trade[](0));
        assertEq(b.targets()[0], 4000);
    }

    function test_recipe_demoNotice10min() public {
        IBasketFactory.BasketParams memory p = _params3();
        p.demo = true;
        p.salt = bytes32("demo");
        Basket d = _create(creator, p, 1000e6);
        assertEq(d.notice(), 10 minutes);
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 2500;
        w[2] = 2500;
        vm.prank(creator);
        d.proposeRecipe(w, bytes32("r"));
        (, uint64 at,) = d.pendingRecipe();
        assertEq(at, block.timestamp + 10 minutes);
    }

    // ------------------------------------------------------------------ remove component
    function test_removeComponent_afterZeroTarget() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 5000;
        w[2] = 0;
        vm.prank(creator);
        b.proposeRecipe(w, bytes32("drop CCC"));

        vm.prank(keeper);
        vm.expectRevert(Basket.CannotRemove.selector); // pending + target != 0
        b.removeComponent(2);

        _warp(24 hours);
        IBasket.Trade[] memory t = new IBasket.Trade[](2);
        t[0] = IBasket.Trade({from: 2, to: 0, amountIn: 0.5e8}); // $100 -> AAA (500)
        t[1] = IBasket.Trade({from: 2, to: 1, amountIn: 1e8}); // $200 -> BBB (500)
        vm.prank(keeper);
        b.executeRebalance(t);

        stocks[2].mint(address(b), 1e5); // dust donation, $0.20
        vm.prank(asha);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.removeComponent(2);
        vm.prank(keeper);
        vm.expectRevert(Basket.CannotRemove.selector);
        b.removeComponent(0);
        vm.expectEmit(address(b));
        emit IBasket.ComponentRemoved(address(stocks[2]));
        vm.prank(keeper);
        b.removeComponent(2);
        assertEq(b.components().length, 2);
        assertEq(stocks[2].balanceOf(treasury), 1e5);
        assertEq(b.nav(), 1000e8);
    }

    function test_removeComponent_valueTooHigh() public {
        uint16[] memory w = new uint16[](3);
        w[0] = 5000;
        w[1] = 5000;
        w[2] = 0;
        vm.prank(creator);
        b.proposeRecipe(w, bytes32("x"));
        _warp(24 hours);
        IBasket.Trade[] memory t = new IBasket.Trade[](2);
        t[0] = IBasket.Trade({from: 2, to: 0, amountIn: 0.5e8});
        t[1] = IBasket.Trade({from: 2, to: 1, amountIn: 1e8});
        vm.prank(keeper);
        b.executeRebalance(t);
        stocks[2].mint(address(b), 1e6); // $2
        vm.prank(keeper);
        vm.expectRevert(Basket.CannotRemove.selector);
        b.removeComponent(2);
    }

    // ------------------------------------------------------------------ reentrancy
    function _reenter(bytes memory payload) internal {
        ReentrantAdapter ra = new ReentrantAdapter(adapter);
        vm.prank(owner);
        factory.allow(address(stocks[0]), address(feeds[0]), address(ra), "");
        ra.arm(address(b), payload); // adapter asserts the inner call reverted with Reentrancy()
        _drift();
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }

    function test_sharedLock_blocksRedeemDuringRebalance() public {
        _reenter(abi.encodeCall(IBasket.redeem, (1, address(this))));
    }

    function test_sharedLock_blocksIssueDuringRebalance() public {
        _reenter(abi.encodeCall(IBasket.issue, (1, address(this))));
    }

    function test_sharedLock_blocksClaimAndAccrueDuringRebalance() public {
        _reenter(abi.encodeCall(IBasket.accrueFee, ()));
    }

    function test_readReentrancy_navBlockedDuringRebalance() public {
        _reenter(abi.encodeCall(IBasket.nav, ()));
    }
}
