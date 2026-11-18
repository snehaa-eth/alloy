// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../../src/BasketFactory.sol";
import {AlloyRouter} from "../../src/AlloyRouter.sol";
import {Basket} from "../../src/Basket.sol";
import {IBasket} from "../../src/interfaces/IBasket.sol";
import {IBasketFactory} from "../../src/interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";
import {UniswapV3Adapter} from "../../src/adapters/UniswapV3Adapter.sol";
import {SimpleFeedGuard} from "../../src/guards/SimpleFeedGuard.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

interface IFaucetF {
    function drip() external;
}

/// @notice Real Uniswap v3 path on a Base Sepolia fork (testnet-env pools, SwapRouter02).
///         Skipped unless FORK_RPC_URL is set, e.g. FORK_RPC_URL=https://sepolia.base.org (or a local base-anvil).
contract UniswapForkTest is Test {
    using stdJson for string;

    BasketFactory internal factory;
    AlloyRouter internal router;
    IB20 internal usdc;
    address[] internal comps;
    address internal keeper = makeAddr("forkKeeper");
    address internal user = makeAddr("forkUser");
    bool internal enabled;

    function setUp() public {
        string memory rpc = vm.envOr("FORK_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        enabled = true;
        vm.createSelectFork(rpc);
        string memory j = vm.readFile("../testnet-env/deployments/84532.json");
        usdc = IB20(j.readAddress(".usdc.token"));
        SimpleFeedGuard guard = new SimpleFeedGuard(address(this), 25 hours, j.readAddress(".feedPauseRegistry"));
        UniswapV3Adapter ad = new UniswapV3Adapter(j.readAddress(".uniswap.swapRouter02"));
        factory = new BasketFactory(address(this), address(usdc), keeper, address(this), address(guard));
        router = new AlloyRouter(address(factory));
        string[3] memory s = ["tGOOGLc", "tMSFTc", "tTSLAc"];
        for (uint256 i; i < 3; ++i) {
            string memory k = string.concat(".stocks.", s[i]);
            address t = j.readAddress(string.concat(k, ".token"));
            comps.push(t);
            factory.allow(t, j.readAddress(string.concat(k, ".feed")), address(ad), abi.encode(uint24(500)));
        }
        vm.prank(user);
        IFaucetF(j.readAddress(".faucet")).drip();
    }

    function _px(address t) internal view returns (uint256) {
        (, int256 a,,,) = IAggregatorV3(factory.tokenConfig(t).feed).latestRoundData();
        return uint256(a);
    }

    function test_fork_createBuySellRebalance_realUniswap() public {
        if (!enabled) vm.skip(true);
        uint16[] memory w = new uint16[](3);
        (w[0], w[1], w[2]) = (4000, 3000, 3000);
        IBasketFactory.BasketParams memory p = IBasketFactory.BasketParams({
            name: "Fork Demo",
            symbol: "FDEMO",
            comps: comps,
            targetBps: w,
            absBandBps: 500,
            relBandBps: 2500,
            capBps: 10_000,
            feeBps: 100,
            demo: true,
            salt: bytes32("fork")
        });
        vm.startPrank(user);
        usdc.approve(address(factory), 100e6);
        Basket b = Basket(factory.createBasket(p, 100e6, new uint256[](3)));
        // seed through real pools lands within 1% of oracle value
        assertApproxEqRel(b.nav(), 100e8, 0.01e18);

        usdc.approve(address(router), 50e6);
        uint256 shares = router.buy(address(b), 50e6, new uint256[](3), 49e18);
        assertApproxEqRel(shares, 50e18, 0.01e18);

        uint256 sellShares = shares * 30 / 100;
        b.approve(address(router), sellShares);
        uint256 before = usdc.balanceOf(user);
        uint256 out = router.sell(address(b), sellShares, new uint256[](3), 14.7e6);
        vm.stopPrank();
        assertEq(usdc.balanceOf(user) - before, out);
        assertApproxEqRel(out, 15e6, 0.01e18);
        assertEq(usdc.balanceOf(address(router)), 0);
        for (uint256 i; i < 3; ++i) {
            assertEq(IB20(comps[i]).balanceOf(address(router)), 0);
        }

        // creator cannot execute; keeper can (small in-band churn through real pools, oracle-guarded)
        vm.prank(user);
        vm.expectRevert(Basket.NotKeeper.selector);
        b.executeRebalance(new IBasket.Trade[](0));
        IBasket.Trade[] memory t = new IBasket.Trade[](1);
        t[0] = IBasket.Trade({from: 0, to: 1, amountIn: 1e6});
        uint256 ts = b.totalSupply();
        vm.prank(keeper);
        b.executeRebalance(t);
        assertEq(b.totalSupply(), ts);
        assertEq(_px(comps[0]) > 0, true);
    }
}
