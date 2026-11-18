// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../src/BasketFactory.sol";
import {AlloyRouter} from "../src/AlloyRouter.sol";
import {UniswapV3Adapter} from "../src/adapters/UniswapV3Adapter.sol";
import {SimpleFeedGuard} from "../src/guards/SimpleFeedGuard.sol";

/// @notice Deploys Alloy core on Base Sepolia (84532) on top of the testnet world from packages/testnet-env.
///
///   Validate on a local fork (never broadcasts to a public network):
///     base-anvil --fork-url https://sepolia.base.org --port 8546 --auto-impersonate
///     base-forge script script/DeployAlloy.s.sol --rpc-url local_fork --broadcast --unlocked --sender <DEPLOYER>
///
///   For fork runs set OUT_JSON=deployments/84532.fork.json NETWORK_LABEL=local-fork so the real file is untouched.
///   Re-running deploys a fresh set (new addresses) and overwrites OUT_JSON; v1 is kept in deployments/84532.v1.json.
///   Env: TVL_CAP_USD8 (default 0 = unlimited on 84532, 5_000e8 elsewhere), KEEPER_ADDRESS (default: deployer), MAX_FEED_AGE (default 25h),
///        TESTNET_ENV_JSON (default ../testnet-env/deployments/84532.json), OUT_JSON (default deployments/84532.json)
contract DeployAlloy is Script {
    using stdJson for string;

    struct Deployed {
        address guard;
        address uniAdapter;
        address factory;
        address router;
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid == 84532, "DeployAlloy: chain 84532 only");
        string memory envJson =
            vm.readFile(vm.envOr("TESTNET_ENV_JSON", string("../testnet-env/deployments/84532.json")));
        address usdc = envJson.readAddress(".usdc.token");
        address swapRouter02 = envJson.readAddress(".uniswap.swapRouter02");
        uint24 feeTier = uint24(envJson.readUint(".uniswap.feeTier"));
        address pauseRegistry = envJson.readAddress(".feedPauseRegistry");
        string[] memory syms = vm.parseJsonKeys(envJson, ".stocks");

        address deployer = msg.sender;
        address keeper = vm.envOr("KEEPER_ADDRESS", deployer);
        uint256 maxAge = vm.envOr("MAX_FEED_AGE", uint256(25 hours));
        // TVL cap (USD, 8 dec): testnet default 0 = unlimited; mainnet keeps the factory default ($5k).
        uint256 tvlCap = vm.envOr("TVL_CAP_USD8", block.chainid == 84532 ? uint256(0) : uint256(5_000e8));

        vm.startBroadcast();
        d.guard = address(new SimpleFeedGuard(deployer, maxAge, pauseRegistry));
        d.uniAdapter = address(new UniswapV3Adapter(swapRouter02));
        BasketFactory factory = new BasketFactory(deployer, usdc, keeper, deployer, d.guard);
        d.factory = address(factory);
        d.router = address(new AlloyRouter(d.factory));
        if (tvlCap != factory.defaultTvlCapUsd()) factory.setDefaultTvlCap(tvlCap);
        for (uint256 i; i < syms.length; ++i) {
            string memory k = string.concat(".stocks.", syms[i]);
            factory.allow(
                envJson.readAddress(string.concat(k, ".token")),
                envJson.readAddress(string.concat(k, ".feed")),
                d.uniAdapter,
                abi.encode(feeTier)
            );
        }
        vm.stopBroadcast();

        _write(d, deployer, keeper, usdc, swapRouter02, feeTier, pauseRegistry, envJson, syms);
    }

    function _write(
        Deployed memory d,
        address deployer,
        address keeper,
        address usdc,
        address swapRouter02,
        uint24 feeTier,
        address pauseRegistry,
        string memory envJson,
        string[] memory syms
    ) internal {
        string memory stocksObj = "stocks";
        string memory stocksJson;
        for (uint256 i; i < syms.length; ++i) {
            string memory k = string.concat(".stocks.", syms[i]);
            string memory s = syms[i];
            vm.serializeAddress(s, "token", envJson.readAddress(string.concat(k, ".token")));
            vm.serializeAddress(s, "feed", envJson.readAddress(string.concat(k, ".feed")));
            string memory one = vm.serializeBytes(s, "poolData", abi.encode(feeTier));
            stocksJson = vm.serializeString(stocksObj, s, one);
        }
        string memory o = "root";
        vm.serializeString(o, "network", vm.envOr("NETWORK_LABEL", string("base-sepolia")));
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeUint(o, "deployedAtBlock", block.number);
        vm.serializeUint(o, "deployedAt", block.timestamp);
        vm.serializeAddress(o, "deployer", deployer);
        vm.serializeAddress(o, "owner", deployer);
        vm.serializeAddress(o, "keeper", keeper);
        vm.serializeAddress(o, "treasury", deployer);
        vm.serializeAddress(o, "usdc", usdc);
        vm.serializeAddress(o, "swapRouter02", swapRouter02);
        vm.serializeUint(o, "feeTier", feeTier);
        vm.serializeAddress(o, "feedPauseRegistry", pauseRegistry);
        vm.serializeAddress(o, "feedGuard", d.guard);
        vm.serializeString(o, "feedGuardKind", "SimpleFeedGuard(strictMultiplier=false)");
        vm.serializeAddress(o, "uniswapV3Adapter", d.uniAdapter);
        vm.serializeAddress(o, "factory", d.factory);
        vm.serializeAddress(o, "basketImplementation", BasketFactory(d.factory).implementation());
        vm.serializeUint(o, "defaultTvlCapUsd8", BasketFactory(d.factory).defaultTvlCapUsd());
        vm.serializeAddress(o, "router", d.router);
        string memory out = vm.serializeString(o, "stocks", stocksJson);
        string memory path = vm.envOr("OUT_JSON", string("deployments/84532.json"));
        vm.writeJson(out, path);
        console2.log("factory", d.factory);
        console2.log("router ", d.router);
        console2.log("written", path);
    }
}
