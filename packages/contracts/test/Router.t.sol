// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {Basket} from "../src/Basket.sol";
import {AlloyRouter} from "../src/AlloyRouter.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

contract RouterTest is Fixture {
    Basket internal b;

    function setUp() public override {
        super.setUp();
        b = _create(creator, _params3(), 1000e6);
    }

    function _assertRouterClean() internal view {
        assertEq(usdc.balanceOf(address(router)), 0, "router usdc");
        assertEq(b.balanceOf(address(router)), 0, "router shares");
        address[] memory comps = b.components();
        for (uint256 i; i < comps.length; ++i) {
            assertEq(IB20(comps[i]).balanceOf(address(router)), 0, "router comp");
            assertEq(IB20(comps[i]).allowance(address(router), address(b)), 0, "router->basket allowance");
            assertEq(IB20(comps[i]).allowance(address(router), address(adapter)), 0, "router->adapter allowance");
            assertEq(IB20(comps[i]).allowance(address(b), address(adapter)), 0, "basket->adapter allowance");
        }
        assertEq(usdc.allowance(address(router), address(adapter)), 0);
    }

    function test_buy_exact() public {
        _mintUsdc(asha, 100e6);
        vm.startPrank(asha);
        usdc.approve(address(router), 100e6);
        vm.expectEmit(address(router));
        emit AlloyRouter.Bought(asha, address(b), 100e6, 100e18);
        uint256 shares = router.buy(address(b), 100e6, new uint256[](3), 100e18);
        vm.stopPrank();
        assertEq(shares, 100e18);
        assertEq(b.balanceOf(asha), 100e18);
        assertEq(b.nav(), 1100e8);
        _assertRouterClean();
    }

    function test_buy_withSlippage_refundsLeftovers() public {
        adapter.setTokenSlippage(address(stocks[1]), 100); // BBB fills 1% worse
        uint256 shares = _buy(asha, b, 100e6);
        assertApproxEqRel(shares, 99e18, 0.001e18);
        // leftovers of AAA/CCC refunded to the user, router clean
        assertGt(stocks[0].balanceOf(asha) + stocks[2].balanceOf(asha), 0);
        _assertRouterClean();
    }

    function test_buy_afterDrift_and_fee() public {
        _setPrice(0, 137e8);
        vm.warp(block.timestamp + 40 days);
        _refreshFeeds();
        uint256 shares = _buy(asha, b, 250e6);
        assertGt(shares, 0);
        _assertRouterClean();
    }

    function test_buy_minShares_reverts() public {
        _mintUsdc(asha, 100e6);
        vm.startPrank(asha);
        usdc.approve(address(router), 100e6);
        vm.expectRevert(abi.encodeWithSelector(AlloyRouter.InsufficientShares.selector, 100e18, 100e18 + 1));
        router.buy(address(b), 100e6, new uint256[](3), 100e18 + 1);
        vm.stopPrank();
    }

    function test_buy_minOut_reverts() public {
        _mintUsdc(asha, 100e6);
        vm.startPrank(asha);
        usdc.approve(address(router), 100e6);
        uint256[] memory mins = new uint256[](3);
        mins[2] = 1e18;
        vm.expectRevert("MockSwapAdapter: minOut");
        router.buy(address(b), 100e6, mins, 0);
        vm.stopPrank();
    }

    function test_buy_guards() public {
        vm.expectRevert(AlloyRouter.UnknownBasket.selector);
        router.buy(address(0xdead), 1, new uint256[](3), 0);
        vm.expectRevert(AlloyRouter.ZeroAmount.selector);
        router.buy(address(b), 0, new uint256[](3), 0);
        _mintUsdc(asha, 10e6);
        vm.startPrank(asha);
        usdc.approve(address(router), 10e6);
        vm.expectRevert(AlloyRouter.LengthMismatch.selector);
        router.buy(address(b), 10e6, new uint256[](2), 0);
        vm.stopPrank();
    }

    function test_buy_paused_reverts() public {
        vm.prank(owner);
        factory.setPaused(true);
        _mintUsdc(asha, 10e6);
        vm.startPrank(asha);
        usdc.approve(address(router), 10e6);
        vm.expectRevert(Basket.ProtocolPaused.selector);
        router.buy(address(b), 10e6, new uint256[](3), 0);
        vm.stopPrank();
    }

    function test_sell_exact() public {
        _buy(asha, b, 100e6);
        vm.startPrank(asha);
        b.approve(address(router), 30e18);
        vm.expectEmit(address(router));
        emit AlloyRouter.Sold(asha, address(b), 30e18, 30e6);
        uint256 out = router.sell(address(b), 30e18, new uint256[](3), 30e6);
        vm.stopPrank();
        assertEq(out, 30e6);
        assertEq(usdc.balanceOf(asha), 30e6);
        assertEq(b.balanceOf(asha), 70e18);
        _assertRouterClean();
    }

    function test_sell_minUsdc_reverts() public {
        _buy(asha, b, 100e6);
        vm.startPrank(asha);
        b.approve(address(router), 30e18);
        vm.expectRevert(abi.encodeWithSelector(AlloyRouter.InsufficientUsdc.selector, 30e6, 30e6 + 1));
        router.sell(address(b), 30e18, new uint256[](3), 30e6 + 1);
        vm.stopPrank();
    }

    function test_sell_worksWhilePaused() public {
        _buy(asha, b, 100e6);
        vm.prank(owner);
        factory.setPaused(true);
        vm.startPrank(asha);
        b.approve(address(router), 100e18);
        router.sell(address(b), 100e18, new uint256[](3), 0);
        vm.stopPrank();
        assertEq(usdc.balanceOf(asha), 100e6);
    }

    function test_sell_revertsIfRouterBlocked_userCanStillRedeemInKind() public {
        _buy(asha, b, 100e6);
        address[] memory accts = new address[](1);
        accts[0] = address(router);
        uint64 pid = StdPrecompiles.POLICY_REGISTRY
            .createPolicyWithAccounts(address(this), IPolicyRegistry.PolicyType.BLOCKLIST, accts);
        stocks[0].updatePolicy(B20Constants.TRANSFER_RECEIVER_POLICY, pid);
        vm.startPrank(asha);
        b.approve(address(router), 10e18);
        vm.expectRevert(abi.encodeWithSelector(AlloyRouter.RedeemIncomplete.selector, 1));
        router.sell(address(b), 10e18, new uint256[](3), 0);
        (, uint256 mask) = b.redeem(10e18, asha); // in-kind exit always available
        vm.stopPrank();
        assertEq(mask, 0);
    }

    function test_sell_needsApproval() public {
        _buy(asha, b, 100e6);
        vm.prank(asha);
        vm.expectRevert();
        router.sell(address(b), 1e18, new uint256[](3), 0);
    }

    function testFuzz_buySell_roundTrip_neverProfits(uint256 usdcIn, uint256 waitSecs, int256 drift) public {
        usdcIn = bound(usdcIn, 1e6, 3000e6);
        waitSecs = bound(waitSecs, 0, 30 days);
        drift = bound(drift, 50e8, 300e8);
        _setPrice(0, drift);
        uint256 shares = _buy(asha, b, usdcIn);
        uint256 refund = usdc.balanceOf(asha);
        uint256 refundVal; // in-kind leftovers valued at oracle (USDC 6 dec)
        address[] memory comps = b.components();
        for (uint256 i; i < comps.length; ++i) {
            refundVal += IB20(comps[i]).balanceOf(asha) * adapter.priceOf(comps[i]) / 1e10;
        }
        if (waitSecs > 0) _warp(waitSecs);
        vm.startPrank(asha);
        b.approve(address(router), shares);
        uint256 out = router.sell(address(b), shares, new uint256[](3), 0);
        vm.stopPrank();
        assertLe(out + refund + refundVal, usdcIn, "round trip profit");
        _assertRouterClean();
    }
}
