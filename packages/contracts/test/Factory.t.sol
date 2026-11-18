// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {Basket} from "../src/Basket.sol";
import {BasketFactory} from "../src/BasketFactory.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {MockV3Aggregator} from "./utils/MockV3Aggregator.sol";
import {Ownable} from "solady/auth/Ownable.sol";

contract FactoryTest is Fixture {
    function test_constructor_state() public view {
        assertEq(factory.owner(), owner);
        assertEq(factory.usdc(), address(usdc));
        assertEq(factory.keeper(), keeper);
        assertEq(factory.treasury(), treasury);
        assertEq(factory.feedGuard(), address(guard));
        assertEq(factory.swapTolBps(), 100);
        assertEq(factory.defaultTvlCapUsd(), 5_000e8);
        assertTrue(factory.implementation() != address(0));
    }

    function test_constructor_zeroAddress() public {
        vm.expectRevert(BasketFactory.ZeroAddress.selector);
        new BasketFactory(owner, address(0), keeper, treasury, address(guard));
    }

    // ------------------------------------------------------------------ allow-list
    function test_allow_onlyOwner() public {
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.allow(address(stocks[0]), address(feeds[0]), address(adapter), "");
    }

    function test_allow_assertsDecimals() public {
        MockV3Aggregator f18 = new MockV3Aggregator(18, 1e18);
        vm.startPrank(owner);
        vm.expectRevert(BasketFactory.BadDecimals.selector);
        factory.allow(address(stocks[0]), address(f18), address(adapter), "");
        vm.expectRevert(BasketFactory.BadDecimals.selector);
        factory.allow(address(usdc), address(feeds[0]), address(adapter), ""); // 6-dec token
        vm.expectRevert(BasketFactory.ZeroAddress.selector);
        factory.allow(address(stocks[0]), address(feeds[0]), address(0), "");
        vm.stopPrank();
    }

    function test_allow_storesConfig_andEmits() public {
        vm.expectEmit(address(factory));
        emit BasketFactory.TokenAllowed(address(stocks[0]), address(feeds[1]), address(adapter), hex"01");
        vm.prank(owner);
        factory.allow(address(stocks[0]), address(feeds[1]), address(adapter), hex"01");
        IBasketFactory.TokenConfig memory c = factory.tokenConfig(address(stocks[0]));
        assertEq(c.feed, address(feeds[1]));
        assertEq(c.adapter, address(adapter));
        assertEq(c.poolData, hex"01");
        assertTrue(c.allowed);
    }

    function test_disallow_blocksNewBaskets_existingStillExit() public {
        Basket b = _create(creator, _params3(), 1000e6);
        vm.prank(owner);
        factory.disallow(address(stocks[0]));
        IBasketFactory.BasketParams memory p = _params3();
        p.salt = bytes32("other");
        _mintUsdc(creator, 100e6);
        vm.startPrank(creator);
        usdc.approve(address(factory), 100e6);
        vm.expectRevert(abi.encodeWithSelector(BasketFactory.NotAllowed.selector, address(stocks[0])));
        factory.createBasket(p, 100e6, new uint256[](3));
        // existing basket: router sell still routes through the stored adapter
        b.approve(address(router), 100e18);
        uint256 out = router.sell(address(b), 100e18, new uint256[](3), 0);
        vm.stopPrank();
        assertEq(out, 100e6);
    }

    // ------------------------------------------------------------------ create
    function test_createBasket_emitsAllFields() public {
        IBasketFactory.BasketParams memory p = _params3();
        address predicted = factory.predictBasket(creator, p.salt);
        _mintUsdc(creator, 1000e6);
        vm.startPrank(creator);
        usdc.approve(address(factory), 1000e6);
        vm.expectEmit(address(factory));
        emit BasketFactory.BasketCreated(
            predicted,
            creator,
            "AI Leaders",
            "AIL",
            p.comps,
            p.targetBps,
            100,
            500,
            2500,
            10_000,
            24 hours,
            false,
            bytes32("s1")
        );
        address b = factory.createBasket(p, 1000e6, new uint256[](3));
        vm.stopPrank();
        assertEq(b, predicted);
        assertTrue(factory.isBasket(b));
        assertEq(factory.basketCount(), 1);
        assertEq(factory.allBaskets(0), b);
        assertEq(usdc.balanceOf(address(factory)), 0);
        assertEq(usdc.allowance(address(factory), address(adapter)), 0);
        assertEq(Basket(b).totalSupply(), 1000e18);
    }

    function test_createBasket_sameSaltPerCreatorOnly() public {
        _create(creator, _params3(), 100e6);
        _create(asha, _params3(), 100e6); // other creator, same salt: fine
        _mintUsdc(creator, 100e6);
        vm.startPrank(creator);
        usdc.approve(address(factory), 100e6);
        vm.expectRevert();
        factory.createBasket(_params3(), 100e6, new uint256[](3));
        vm.stopPrank();
    }

    function _expectCreateRevert(IBasketFactory.BasketParams memory p, uint256 seed, uint256 nMin, bytes memory err)
        internal
    {
        _mintUsdc(creator, seed);
        vm.startPrank(creator);
        usdc.approve(address(factory), seed);
        if (err.length == 0) vm.expectRevert();
        else vm.expectRevert(err);
        factory.createBasket(p, seed, new uint256[](nMin));
        vm.stopPrank();
    }

    function test_createBasket_validation() public {
        IBasketFactory.BasketParams memory p = _params3();
        _expectCreateRevert(p, 9e6, 3, abi.encodeWithSelector(BasketFactory.SeedTooSmall.selector));
        _expectCreateRevert(p, 100e6, 2, abi.encodeWithSelector(BasketFactory.LengthMismatch.selector));

        p = _params3();
        p.feeBps = 201;
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(Basket.InvalidParams.selector));

        p = _params3();
        p.targetBps[2] = 2999;
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(Basket.InvalidWeights.selector));

        p = _params3();
        p.capBps = 3500; // target 4000 > cap
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(Basket.InvalidWeights.selector));

        p = _params3();
        p.targetBps[0] = 0;
        p.targetBps[1] = 7000;
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(Basket.InvalidWeights.selector));

        p = _params3();
        p.comps[2] = p.comps[0];
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(BasketFactory.DuplicateComponent.selector, p.comps[0]));

        p = _params3();
        p.comps[2] = address(usdc);
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(BasketFactory.NotAllowed.selector, address(usdc)));

        p = _params3();
        p.absBandBps = 0;
        _expectCreateRevert(p, 100e6, 3, abi.encodeWithSelector(Basket.InvalidParams.selector));
    }

    function test_createBasket_tooManyComponents() public {
        IBasketFactory.BasketParams memory p = _params3();
        address[] memory comps = new address[](11);
        uint16[] memory w = new uint16[](11);
        p.comps = comps;
        p.targetBps = w;
        _expectCreateRevert(p, 100e6, 11, ""); // NotAllowed(address(0)) fires first; Basket also caps at 10
    }

    function test_createBasket_minOutsEnforced() public {
        IBasketFactory.BasketParams memory p = _params3();
        _mintUsdc(creator, 1000e6);
        vm.startPrank(creator);
        usdc.approve(address(factory), 1000e6);
        uint256[] memory mins = new uint256[](3);
        mins[0] = 4e8 + 1;
        vm.expectRevert("MockSwapAdapter: minOut");
        factory.createBasket(p, 1000e6, mins);
        vm.stopPrank();
    }

    function test_createBasket_tvlCapOnSeed() public {
        _expectCreateRevert(_params3(), 5001e6, 3, "");
    }

    function test_createBasket_paused() public {
        vm.prank(owner);
        factory.setPaused(true);
        _expectCreateRevert(_params3(), 100e6, 3, abi.encodeWithSelector(Basket.ProtocolPaused.selector));
    }

    // ------------------------------------------------------------------ admin
    function test_admin_setters() public {
        vm.startPrank(owner);
        factory.setKeeper(asha);
        factory.setTreasury(ben);
        factory.setSwapTolBps(250);
        factory.setDefaultTvlCap(10_000e8);
        factory.setBasketTvlCap(address(1), 7e8);
        factory.setFeedGuard(address(2));
        vm.expectRevert(BasketFactory.BadTolerance.selector);
        factory.setSwapTolBps(501);
        vm.expectRevert(BasketFactory.ZeroAddress.selector);
        factory.setFeedGuard(address(0));
        vm.stopPrank();
        assertEq(factory.keeper(), asha);
        assertEq(factory.treasury(), ben);
        assertEq(factory.swapTolBps(), 250);
        assertEq(factory.tvlCapOf(address(9)), 10_000e8);
        assertEq(factory.tvlCapOf(address(1)), 7e8);
        vm.prank(owner);
        factory.setBasketTvlCap(address(1), type(uint256).max);
        assertEq(factory.tvlCapOf(address(1)), 0);
    }

    function test_admin_onlyOwner() public {
        vm.startPrank(asha);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setKeeper(asha);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setPaused(true);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setTreasury(asha);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setSwapTolBps(1);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setDefaultTvlCap(1);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setBasketTvlCap(address(1), 1);
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.disallow(address(1));
        vm.expectRevert(Ownable.Unauthorized.selector);
        factory.setFeedGuard(address(1));
        vm.stopPrank();
    }

    function test_keeperRotation_appliesToExistingBaskets() public {
        Basket b = _create(creator, _params3(), 1000e6);
        vm.expectEmit(address(factory));
        emit BasketFactory.KeeperSet(asha);
        vm.prank(owner);
        factory.setKeeper(asha);
        _setPrice(0, 150e8);
        vm.prank(keeper);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.executeRebalance(_trade(0, 1, 0.4e8));
        vm.prank(asha);
        b.executeRebalance(_trade(0, 1, 0.4e8));
    }
}
