// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {Basket} from "../src/Basket.sol";
import {IBasket} from "../src/interfaces/IBasket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";

/// @notice §3.5 item 9. Exact-number walkthroughs (fee 0, zero slippage so every number is exact).
contract ScenarioTest is Fixture {
    /// Asha/Ben: deposit -> drift -> trim.
    ///  Creator seeds $1,000 into DUO = 50% tAAA ($100) / 50% tBBB ($50), Balanced bands (5% abs / 25% rel).
    ///    bundle 5 AAA + 10 BBB, 1,000 shares (1 locked as dead shares), NAV/share $1.00
    ///  Asha buys $1,000 -> 1,000 shares. Ben buys $2,000 -> 2,000 shares.
    ///    ts 4,000, bundle 20 AAA + 40 BBB, NAV $4,000
    ///  AAA rallies to $150: AAA $3,000 (60%) / BBB $2,000 (40%), NAV $5,000, NAV/share $1.25
    ///    AAA drift 10pp > band 5pp -> keeper trims: sell 2 AAA ($300) -> 6 BBB
    ///    -> AAA 18 ($2,700, 54%) / BBB 46 ($2,300, 46%): in band, closer to target, no crossing, no loss
    ///  Asha $1,250, Ben $2,500 unchanged by the trim. Asha sells 30% (300 shares) -> exactly $375 USDC.
    function test_ashaBen_depositDriftTrim() public {
        Basket b = _create(creator, _params2(0), 1000e6);
        (, uint256[] memory bal) = b.getBundle();
        assertEq(bal[0], 5e8);
        assertEq(bal[1], 10e8);
        assertEq(b.navPerShare(), 1e8);

        assertEq(_buy(asha, b, 1000e6), 1000e18);
        assertEq(_buy(ben, b, 2000e6), 2000e18);
        assertEq(b.totalSupply(), 4000e18);
        (, bal) = b.getBundle();
        assertEq(bal[0], 20e8);
        assertEq(bal[1], 40e8);
        assertEq(b.nav(), 4000e8);

        _setPrice(0, 150e8);
        assertEq(b.nav(), 5000e8);
        assertEq(b.navPerShare(), 1.25e8);
        uint256[] memory w = _weightsBps(b);
        assertEq(w[0], 6000);
        assertEq(w[1], 4000);

        vm.expectEmit(address(b));
        emit IBasket.Rebalanced(5000e8, 5000e8, 0, keeper);
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 2e8));

        (, bal) = b.getBundle();
        assertEq(bal[0], 18e8);
        assertEq(bal[1], 46e8);
        w = _weightsBps(b);
        assertEq(w[0], 5400);
        assertEq(w[1], 4600);
        assertEq(b.totalSupply(), 4000e18);
        assertEq(b.balanceOf(asha) * b.navPerShare() / 1e18, 1250e8);
        assertEq(b.balanceOf(ben) * b.navPerShare() / 1e18, 2500e8);

        vm.startPrank(asha);
        b.approve(address(router), 300e18);
        uint256 out = router.sell(address(b), 300e18, new uint256[](2), 375e6);
        vm.stopPrank();
        assertEq(out, 375e6); // 7.5% of bundle: 1.35 AAA ($202.5) + 3.45 BBB ($172.5)
        assertEq(b.balanceOf(asha), 700e18);
    }

    /// Recipe change with notice: followers can exit at the old recipe during the 24h window.
    function test_recipeChange_withNotice_followerExitsFirst() public {
        Basket b = _create(creator, _params2(0), 1000e6);
        _buy(ben, b, 1000e6);
        uint16[] memory w = new uint16[](2);
        w[0] = 7000;
        w[1] = 3000;
        vm.prank(creator);
        b.proposeRecipe(w, keccak256("AAA guidance raised"));

        // Ben disagrees and withdraws in kind during the notice window, at the OLD 50/50 bundle
        _warp(12 hours);
        vm.prank(ben);
        (uint256[] memory amts,) = b.redeem(1000e18, ben);
        assertEq(amts[0], 5e8);
        assertEq(amts[1], 10e8);

        // too early: band rule still uses 50/50 -> trades toward 70/30 revert
        vm.prank(keeper);
        vm.expectRevert();
        b.executeRebalance(_trade(1, 0, 4e8));

        _warp(12 hours);
        // NAV $1,000: AAA 500 -> 700 means sell $200 BBB = 4 BBB
        vm.prank(keeper);
        b.executeRebalance(_trade(1, 0, 4e8));
        uint256[] memory wt = _weightsBps(b);
        assertEq(wt[0], 7000);
        assertEq(wt[1], 3000);
        assertEq(b.targets()[0], 7000);
    }

    /// Split simulated: multiplier 1 -> 3 on AAA, feed (px x multiplier per raw) unchanged. Users, NAV and the
    /// next trim are unaffected.
    function test_split_viaMultiplier_thenTrimAndExit() public {
        Basket b = _create(creator, _params2(0), 1000e6);
        _buy(asha, b, 1000e6);
        uint256 navBefore = b.nav();
        stocks[0].updateMultiplier(3e18);
        assertEq(b.nav(), navBefore);
        assertEq(stocks[0].balanceOf(address(b)), 10e8); // raw unchanged

        _setPrice(0, 150e8); // post-split rally (still per raw token)
        vm.prank(keeper);
        b.executeRebalance(_trade(0, 1, 1e8)); // $1500/$1000 -> sell 1 AAA ($150) -> 54 / 46
        uint256[] memory w = _weightsBps(b);
        assertEq(w[0], 5400);

        vm.startPrank(asha);
        b.approve(address(router), 1000e18);
        uint256 out = router.sell(address(b), 1000e18, new uint256[](2), 0);
        vm.stopPrank();
        assertEq(out, 1250e6);
    }

    /// Market-closed / stale feeds: rebalances halt, but in-kind exit and router sells keep working.
    function test_marketClosed_exitStillWorks() public {
        Basket b = _create(creator, _params2(0), 1000e6);
        _buy(asha, b, 500e6);
        vm.warp(block.timestamp + 3 days); // weekend: feeds stale
        _setPrice(0, 150e8);
        feeds[1].setWithTimestamp(50e8, block.timestamp - 3 days);
        vm.prank(keeper);
        vm.expectRevert();
        b.executeRebalance(_trade(0, 1, 1e8));
        vm.prank(asha);
        (uint256[] memory amts, uint256 mask) = b.redeem(500e18, asha);
        assertEq(mask, 0);
        assertEq(amts[0], 2.5e8);
    }
}
