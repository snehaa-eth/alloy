// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../src/BasketFactory.sol";
import {AlloyRouter} from "../src/AlloyRouter.sol";
import {Basket} from "../src/Basket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "../src/interfaces/IAggregatorV3.sol";

interface IFaucet {
    function drip() external;
}

interface IERC20Min {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice Fork validation: demo basket 40/30/30 tGOOGLc/tMSFTc/tTSLAc seeded with faucet tUSDC, then a router buy
///         and a 30% sell through the real Uniswap v3 pools. minOuts = oracle quote x (1 - SLIPPAGE_BPS).
///   base-forge script script/DemoBasket.s.sol --rpc-url local_fork --broadcast --unlocked --sender <ADDR>
contract DemoBasket is Script {
    using stdJson for string;

    uint256 internal constant SEED = 100e6;
    uint256 internal constant BUY = 50e6;

    function run() external {
        string memory envJson = vm.readFile("../testnet-env/deployments/84532.json");
        string memory dep = vm.readFile(vm.envOr("OUT_JSON", string("deployments/84532.json")));
        BasketFactory factory = BasketFactory(dep.readAddress(".factory"));
        AlloyRouter router = AlloyRouter(dep.readAddress(".router"));
        address usdc = dep.readAddress(".usdc");
        uint256 slip = vm.envOr("SLIPPAGE_BPS", uint256(300));

        address[] memory comps = new address[](3);
        comps[0] = envJson.readAddress(".stocks.tGOOGLc.token");
        comps[1] = envJson.readAddress(".stocks.tMSFTc.token");
        comps[2] = envJson.readAddress(".stocks.tTSLAc.token");
        uint16[] memory w = new uint16[](3);
        (w[0], w[1], w[2]) = (4000, 3000, 3000);

        IBasketFactory.BasketParams memory p = IBasketFactory.BasketParams({
            name: "Alloy Demo: Big Tech",
            symbol: "aDEMO",
            comps: comps,
            targetBps: w,
            absBandBps: 500,
            relBandBps: 2500,
            capBps: 10_000,
            feeBps: 100,
            demo: true,
            salt: keccak256(abi.encode("demo", block.timestamp))
        });

        uint256[] memory seedMins = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            seedMins[i] = _minOut(factory, comps[i], SEED * w[i] / 10_000, slip);
        }

        vm.startBroadcast();
        // The faucet allows one drip per address per 24h, so only drip when the balance is too low.
        if (IERC20Min(usdc).balanceOf(msg.sender) < SEED + BUY) IFaucet(envJson.readAddress(".faucet")).drip();
        IERC20Min(usdc).approve(address(factory), SEED);
        Basket b = Basket(factory.createBasket(p, SEED, seedMins));
        console2.log("basket", address(b));
        console2.log("seed shares (creator)", b.balanceOf(msg.sender));
        console2.log("nav (usd8)", b.nav());

        uint256[] memory vals = b.componentValues();
        uint256 tot = vals[0] + vals[1] + vals[2];
        uint256[] memory buyMins = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            buyMins[i] = _minOut(factory, comps[i], BUY * vals[i] / tot, slip);
        }
        IERC20Min(usdc).approve(address(router), BUY);
        uint256 sharesBefore = b.balanceOf(msg.sender);
        uint256 bought =
            router.buy(address(b), BUY, buyMins, BUY * 1e12 * (10_000 - slip) / 10_000 * 1e8 / b.navPerShare());
        console2.log("buy: shares", bought);

        uint256 sellShares = bought * 30 / 100;
        uint256[] memory amts = b.previewRedeem(sellShares);
        uint256[] memory sellMins = new uint256[](3);
        uint256 expUsdc;
        for (uint256 i; i < 3; ++i) {
            uint256 usd6 = amts[i] * _px(factory, comps[i]) / 1e10;
            expUsdc += usd6;
            sellMins[i] = usd6 * (10_000 - slip) / 10_000;
        }
        b.approve(address(router), sellShares);
        uint256 usdcBefore = IERC20Min(usdc).balanceOf(msg.sender);
        uint256 got = router.sell(address(b), sellShares, sellMins, expUsdc * (10_000 - slip) / 10_000);
        vm.stopBroadcast();

        console2.log("sell 30%: shares", sellShares);
        console2.log("sell 30%: usdc out", got, "oracle-expected", expUsdc);
        console2.log("usdc delta", IERC20Min(usdc).balanceOf(msg.sender) - usdcBefore);
        console2.log("shares left", b.balanceOf(msg.sender) - sharesBefore);
        console2.log("router usdc bal", IERC20Min(usdc).balanceOf(address(router)));
    }

    function _px(BasketFactory f, address token) internal view returns (uint256) {
        (, int256 a,,,) = IAggregatorV3(f.tokenConfig(token).feed).latestRoundData();
        return uint256(a);
    }

    /// usdc6 -> token8 at oracle, minus slippage
    function _minOut(BasketFactory f, address token, uint256 usdc6, uint256 slip) internal view returns (uint256) {
        return usdc6 * 1e10 / _px(f, token) * (10_000 - slip) / 10_000;
    }
}
