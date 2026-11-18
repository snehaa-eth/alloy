// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

import {Basket} from "../../src/Basket.sol";
import {BasketFactory} from "../../src/BasketFactory.sol";
import {AlloyRouter} from "../../src/AlloyRouter.sol";
import {IBasket} from "../../src/interfaces/IBasket.sol";
import {IBasketFactory} from "../../src/interfaces/IBasketFactory.sol";
import {SimpleFeedGuard} from "../../src/guards/SimpleFeedGuard.sol";
import {MockV3Aggregator} from "./MockV3Aggregator.sol";
import {MockSwapAdapter} from "./MockSwapAdapter.sol";

abstract contract Fixture is Test {
    address internal owner = makeAddr("owner");
    address internal keeper = makeAddr("keeper");
    address internal treasury = makeAddr("treasury");
    address internal creator = makeAddr("creator");
    address internal asha = makeAddr("asha");
    address internal ben = makeAddr("ben");

    IB20 internal usdc;
    IB20Asset[] internal stocks;
    MockV3Aggregator[] internal feeds;
    MockSwapAdapter internal adapter;
    SimpleFeedGuard internal guard;
    BasketFactory internal factory;
    AlloyRouter internal router;

    uint256 internal constant T0 = 1_750_000_000;

    function setUp() public virtual {
        vm.warp(T0);
        usdc = IB20(_createStable("Test USDC", "tUSDC", "tusdc"));
        stocks.push(IB20Asset(_createAsset("Test AAA", "tAAA", "aaa")));
        stocks.push(IB20Asset(_createAsset("Test BBB", "tBBB", "bbb")));
        stocks.push(IB20Asset(_createAsset("Test CCC", "tCCC", "ccc")));
        stocks.push(IB20Asset(_createAsset("Test DDD", "tDDD", "ddd")));
        feeds.push(new MockV3Aggregator(8, 100e8));
        feeds.push(new MockV3Aggregator(8, 50e8));
        feeds.push(new MockV3Aggregator(8, 200e8));
        feeds.push(new MockV3Aggregator(8, 10e8));

        adapter = new MockSwapAdapter(address(usdc));
        usdc.grantRole(B20Constants.MINT_ROLE, address(adapter));
        for (uint256 i; i < stocks.length; ++i) {
            adapter.setFeed(address(stocks[i]), address(feeds[i]));
            stocks[i].grantRole(B20Constants.MINT_ROLE, address(adapter));
        }

        guard = new SimpleFeedGuard(owner, 25 hours);
        factory = new BasketFactory(owner, address(usdc), keeper, treasury, address(guard));
        router = new AlloyRouter(address(factory));
        vm.startPrank(owner);
        for (uint256 i; i < stocks.length; ++i) {
            factory.allow(address(stocks[i]), address(feeds[i]), address(adapter), abi.encode(uint24(3000)));
        }
        vm.stopPrank();
        vm.label(address(usdc), "tUSDC");
        vm.label(address(stocks[0]), "tAAA");
        vm.label(address(stocks[1]), "tBBB");
        vm.label(address(stocks[2]), "tCCC");
        vm.label(address(stocks[3]), "tDDD");
    }

    // ------------------------------------------------------------------ B20 helpers
    function _createAsset(string memory n, string memory s, bytes32 salt) internal returns (address) {
        bytes[] memory init = new bytes[](2);
        init[0] = abi.encodeWithSignature("grantRole(bytes32,address)", B20Constants.MINT_ROLE, address(this));
        init[1] = abi.encodeWithSignature("grantRole(bytes32,address)", B20Constants.OPERATOR_ROLE, address(this));
        return StdPrecompiles.B20_FACTORY
            .createB20(
                IB20Factory.B20Variant.ASSET,
                salt,
                abi.encode(
                    IB20Factory.B20AssetCreateParams({
                        version: 1, name: n, symbol: s, initialAdmin: address(this), decimals: 8
                    })
                ),
                init
            );
    }

    function _createStable(string memory n, string memory s, bytes32 salt) internal returns (address) {
        bytes[] memory init = new bytes[](1);
        init[0] = abi.encodeWithSignature("grantRole(bytes32,address)", B20Constants.MINT_ROLE, address(this));
        return StdPrecompiles.B20_FACTORY
            .createB20(
                IB20Factory.B20Variant.STABLECOIN,
                salt,
                abi.encode(
                    IB20Factory.B20StablecoinCreateParams({
                        version: 1, name: n, symbol: s, initialAdmin: address(this), currency: "USD"
                    })
                ),
                init
            );
    }

    function _mintUsdc(address to, uint256 amt) internal {
        usdc.mint(to, amt);
    }

    function _mintStock(uint256 i, address to, uint256 amt) internal {
        stocks[i].mint(to, amt);
    }

    function _setPrice(uint256 i, int256 px) internal {
        feeds[i].set(px);
    }

    function _refreshFeeds() internal {
        for (uint256 i; i < feeds.length; ++i) {
            feeds[i].set(feeds[i].answer());
        }
    }

    function _warp(uint256 dt) internal {
        vm.warp(block.timestamp + dt);
        _refreshFeeds();
    }

    // ------------------------------------------------------------------ basket helpers
    function _params3() internal view returns (IBasketFactory.BasketParams memory p) {
        address[] memory comps = new address[](3);
        comps[0] = address(stocks[0]);
        comps[1] = address(stocks[1]);
        comps[2] = address(stocks[2]);
        uint16[] memory w = new uint16[](3);
        w[0] = 4000;
        w[1] = 3000;
        w[2] = 3000;
        p = IBasketFactory.BasketParams({
            name: "AI Leaders",
            symbol: "AIL",
            comps: comps,
            targetBps: w,
            absBandBps: 500,
            relBandBps: 2500,
            capBps: 10_000,
            feeBps: 100,
            demo: false,
            salt: bytes32("s1")
        });
    }

    function _params2(uint16 feeBps) internal view returns (IBasketFactory.BasketParams memory p) {
        address[] memory comps = new address[](2);
        comps[0] = address(stocks[0]);
        comps[1] = address(stocks[1]);
        uint16[] memory w = new uint16[](2);
        w[0] = 5000;
        w[1] = 5000;
        p = IBasketFactory.BasketParams({
            name: "Duo",
            symbol: "DUO",
            comps: comps,
            targetBps: w,
            absBandBps: 500,
            relBandBps: 2500,
            capBps: 10_000,
            feeBps: feeBps,
            demo: false,
            salt: bytes32("s2")
        });
    }

    function _create(address who, IBasketFactory.BasketParams memory p, uint256 seed) internal returns (Basket b) {
        _mintUsdc(who, seed);
        vm.startPrank(who);
        usdc.approve(address(factory), seed);
        b = Basket(factory.createBasket(p, seed, new uint256[](p.comps.length)));
        vm.stopPrank();
    }

    function _buy(address who, Basket b, uint256 usdcIn) internal returns (uint256 shares) {
        _mintUsdc(who, usdcIn);
        vm.startPrank(who);
        usdc.approve(address(router), usdcIn);
        shares = router.buy(address(b), usdcIn, new uint256[](b.components().length), 0);
        vm.stopPrank();
    }

    /// @dev Mint the exact in-kind bundle for `shares` to `who` and issue.
    function _issueInKind(address who, Basket b, uint256 shares) internal returns (uint256[] memory amts) {
        amts = b.previewIssue(shares);
        address[] memory comps = b.components();
        for (uint256 i; i < comps.length; ++i) {
            IB20(comps[i]).mint(who, amts[i]);
        }
        vm.startPrank(who);
        for (uint256 i; i < comps.length; ++i) {
            IB20(comps[i]).approve(address(b), amts[i]);
        }
        b.issue(shares, who);
        vm.stopPrank();
    }

    function _trade(uint8 from, uint8 to, uint256 amt) internal pure returns (IBasket.Trade[] memory t) {
        t = new IBasket.Trade[](1);
        t[0] = IBasket.Trade({from: from, to: to, amountIn: amt});
    }

    function _weightsBps(Basket b) internal view returns (uint256[] memory w) {
        uint256[] memory v = b.componentValues();
        uint256 total;
        for (uint256 i; i < v.length; ++i) {
            total += v[i];
        }
        w = new uint256[](v.length);
        for (uint256 i; i < v.length; ++i) {
            w[i] = v[i] * 10_000 / total;
        }
    }
}
