// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../src/BasketFactory.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "../src/interfaces/IAggregatorV3.sol";

interface IWinnersB20 {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

/// @notice Creates "The AI Build-Out" as a Let Winners Run basket on Base Sepolia (84532).
///         Style decision (2026-11-19): an AI-growth story should let winners keep growing,
///         so there are no drift trims (bands 10_000) and nothing is sold unless one stock passes 60% (cap 6_000).
///         It replaces the earlier Balanced version (0x708f...F9e4) as the featured basket.
///         Recipe: tNVDAc/tMSFTc/tGOOGLc/tAMZNc 40/25/20/15 (no META in the testnet set).
/// Env (optional): SEED_USDC (default 1000e6), SLIPPAGE_BPS (300), FEE_BPS (100), WINNERS_CAP_BPS (6000).
contract SeedAIWinners is Script {
    using stdJson for string;

    function run() external {
        require(block.chainid == 84532, "SeedAIWinners: 84532 only");
        string memory envJson = vm.readFile("../testnet-env/deployments/84532.json");
        string memory dep = vm.readFile("deployments/84532.json");
        BasketFactory factory = BasketFactory(dep.readAddress(".factory"));
        address usdc = dep.readAddress(".usdc");
        uint256 seed = vm.envOr("SEED_USDC", uint256(1000e6));
        uint256 slip = vm.envOr("SLIPPAGE_BPS", uint256(300));

        string[4] memory syms = ["tNVDAc", "tMSFTc", "tGOOGLc", "tAMZNc"];
        uint16[] memory w = new uint16[](4);
        (w[0], w[1], w[2], w[3]) = (4000, 2500, 2000, 1500);
        address[] memory comps = new address[](4);
        uint256[] memory mins = new uint256[](4);
        uint256 spent;
        for (uint256 i; i < 4; ++i) {
            comps[i] = envJson.readAddress(string.concat(".stocks.", syms[i], ".token"));
            uint256 slice = i == 3 ? seed - spent : seed * w[i] / 10_000;
            spent += slice;
            (, int256 a,,,) = IAggregatorV3(factory.tokenConfig(comps[i]).feed).latestRoundData();
            mins[i] = slice * 1e10 / uint256(a) * (10_000 - slip) / 10_000;
        }

        IBasketFactory.BasketParams memory p = IBasketFactory.BasketParams({
            name: "The AI Build-Out",
            symbol: "aAIW",
            comps: comps,
            targetBps: w,
            absBandBps: 10_000,
            relBandBps: 10_000,
            capBps: uint16(vm.envOr("WINNERS_CAP_BPS", uint256(6000))),
            feeBps: uint16(vm.envOr("FEE_BPS", uint256(100))),
            demo: false,
            salt: keccak256(abi.encode("alloy-seed", "winners-v1", "aAIW"))
        });

        vm.startBroadcast();
        if (IWinnersB20(usdc).balanceOf(msg.sender) < seed) IWinnersB20(usdc).mint(msg.sender, seed);
        IWinnersB20(usdc).approve(address(factory), seed);
        address basket = factory.createBasket(p, seed, mins);
        vm.stopBroadcast();

        console2.log("AI_WINNERS_BASKET", basket);
    }
}
