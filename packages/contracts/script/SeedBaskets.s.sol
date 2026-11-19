// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../src/BasketFactory.sol";
import {Basket} from "../src/Basket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "../src/interfaces/IAggregatorV3.sol";

interface ISeedFaucet {
    function drip() external;
}

interface ISeedB20 {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function mint(address to, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @notice Creates Alloy's seed baskets on Base Sepolia (84532) from the 6 testnet-env stocks and prints their
///         addresses as JSON. Strategy mode = basket params (ARCHITECTURE §3.1) + keeper policy (apps/worker).
///
///   1. "The AI Build-Out"   tNVDAc/tMSFTc/tGOOGLc/tAMZNc 40/25/20/15   Balanced (500/2500/10_000)
///      (the real-world theme also holds META; there is no META in the 6-stock testnet set, so it is left out)
///   2. "Big Tech, Trimmed"  tAAPLc/tMSFTc/tGOOGLc/tAMZNc 25 each       Balanced (500/2500/10_000)
///   3. "Conviction Bets"    tTSLAc/tNVDAc 60/40                         Let Winners Run (10_000/10_000/cap)
///      NOTE: the canonical LWR cap is 40%, but the factory requires every target <= cap, so a 60% TSLA target
///      needs cap >= 60%. We use cap = 70% (CONVICTION_CAP_BPS): no drift trims, only trims above 70%.
///   4. "Alloy Demo: Judges' Basket" tNVDAc/tGOOGLc/tMSFTc 50/25/25    Balanced, demo = true (10-minute notice)
///
/// tUSDC: the deployer holds MINT_ROLE on tUSDC (testnet-env DeployTestnet grants it), so the script mints what it
/// needs. Without the role it falls back to one faucet drip (1,000 tUSDC/day), which only covers SEED_USDC <= 250.
///
/// Salts are deterministic per (SALT_VERSION, symbol): re-running with the same SALT_VERSION reverts in
/// createBasket (clone already exists) instead of creating duplicates. Bump SALT_VERSION for a fresh set.
///
/// Env (all optional): SEED_USDC (6 dec, default 1000e6 per basket), DEMO_SEED_USDC (default 500e6),
///   SLIPPAGE_BPS (default 300), FEE_BPS (default 100), CONVICTION_CAP_BPS (default 7000), SALT_VERSION ("v1"),
///   ALLOY_DEPLOYMENTS (default deployments/84532.json), SEED_OUT (if set, also writes the JSON there; must be
///   under ./deployments).
///
/// Local fork (validation):
///   base-anvil --fork-url https://sepolia.base.org --port 8548 --auto-impersonate
///   base-forge script script/SeedBaskets.s.sol --rpc-url http://127.0.0.1:8548 --broadcast --unlocked \
///     --sender 0xcBe600349CE4cF89842Bc371E4a4062140CDCCcD --slow
/// Base Sepolia (real): see apps/worker/README.md "Seeding baskets".
contract SeedBaskets is Script {
    using stdJson for string;

    bytes32 internal constant MINT_ROLE = keccak256("MINT_ROLE");

    struct Spec {
        string name;
        string symbol;
        string[] syms;
        uint16[] w;
        uint16 absBand;
        uint16 relBand;
        uint16 cap;
        bool demo;
        uint256 seed;
        string mode; // keeper policy label, informational
    }

    string internal envJson;
    BasketFactory internal factory;
    address internal usdc;
    uint256 internal slip;

    function run() external {
        require(block.chainid == 84532, "SeedBaskets: chain 84532 (or a fork of it) only");
        envJson = vm.readFile("../testnet-env/deployments/84532.json");
        string memory dep = vm.readFile(vm.envOr("ALLOY_DEPLOYMENTS", string("deployments/84532.json")));
        factory = BasketFactory(dep.readAddress(".factory"));
        usdc = dep.readAddress(".usdc");
        slip = vm.envOr("SLIPPAGE_BPS", uint256(300));
        uint256 seed = vm.envOr("SEED_USDC", uint256(1000e6));
        uint256 demoSeed = vm.envOr("DEMO_SEED_USDC", uint256(500e6));
        uint16 convCap = uint16(vm.envOr("CONVICTION_CAP_BPS", uint256(7000)));

        Spec[] memory specs = new Spec[](4);
        specs[0] = _spec("The AI Build-Out", "aAIBO", _s4("tNVDAc", "tMSFTc", "tGOOGLc", "tAMZNc"),
            _w4(4000, 2500, 2000, 1500), 500, 2500, 10_000, false, seed, "balanced");
        specs[1] = _spec("Big Tech, Trimmed", "aBIGT", _s4("tAAPLc", "tMSFTc", "tGOOGLc", "tAMZNc"),
            _w4(2500, 2500, 2500, 2500), 500, 2500, 10_000, false, seed, "balanced");
        string[] memory cs = new string[](2);
        (cs[0], cs[1]) = ("tTSLAc", "tNVDAc");
        uint16[] memory cw = new uint16[](2);
        (cw[0], cw[1]) = (6000, 4000);
        specs[2] = _spec("Conviction Bets", "aCONV", cs, cw, 10_000, 10_000, convCap, false, seed, "let-winners-run");
        string[] memory ds = new string[](3);
        (ds[0], ds[1], ds[2]) = ("tNVDAc", "tGOOGLc", "tMSFTc");
        uint16[] memory dw = new uint16[](3);
        (dw[0], dw[1], dw[2]) = (5000, 2500, 2500);
        specs[3] = _spec("Alloy Demo: Judges' Basket", "aDEMO", ds, dw, 500, 2500, 10_000, true, demoSeed, "balanced");

        uint256 total;
        for (uint256 i; i < specs.length; ++i) {
            total += specs[i].seed;
        }

        vm.startBroadcast();
        address me = msg.sender;
        uint256 bal = ISeedB20(usdc).balanceOf(me);
        if (bal < total) {
            if (ISeedB20(usdc).hasRole(MINT_ROLE, me)) {
                ISeedB20(usdc).mint(me, total - bal);
            } else {
                ISeedFaucet(envJson.readAddress(".faucet")).drip();
            }
        }
        require(ISeedB20(usdc).balanceOf(me) >= total, "SeedBaskets: not enough tUSDC (no MINT_ROLE; faucet too small)");
        ISeedB20(usdc).approve(address(factory), total);

        address[] memory created = new address[](specs.length);
        for (uint256 i; i < specs.length; ++i) {
            created[i] = _create(specs[i]);
        }
        vm.stopBroadcast();

        string memory root = "seed";
        string memory json;
        for (uint256 i; i < specs.length; ++i) {
            Basket b = Basket(created[i]);
            string memory k = specs[i].symbol;
            vm.serializeAddress(k, "address", created[i]);
            vm.serializeString(k, "name", specs[i].name);
            vm.serializeString(k, "mode", specs[i].mode);
            vm.serializeBool(k, "demo", specs[i].demo);
            vm.serializeUint(k, "seedUsdc6", specs[i].seed);
            vm.serializeUint(k, "navUsd8", b.nav());
            string memory obj = vm.serializeUint(k, "creatorShares", b.balanceOf(me));
            json = vm.serializeString(root, k, obj);
        }
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "factory", address(factory));
        json = vm.serializeAddress(root, "creator", me);
        console2.log("SEED_BASKETS_JSON");
        console2.log(json);
        string memory out = vm.envOr("SEED_OUT", string(""));
        if (bytes(out).length != 0) vm.writeJson(json, out);
    }

    function _create(Spec memory s) internal returns (address basket) {
        uint256 n = s.syms.length;
        address[] memory comps = new address[](n);
        uint256[] memory mins = new uint256[](n);
        uint256 spent;
        for (uint256 i; i < n; ++i) {
            comps[i] = envJson.readAddress(string.concat(".stocks.", s.syms[i], ".token"));
            // Same split as the factory: last leg takes the remainder.
            uint256 slice = i == n - 1 ? s.seed - spent : s.seed * s.w[i] / 10_000;
            spent += slice;
            mins[i] = _minOut(comps[i], slice);
        }
        IBasketFactory.BasketParams memory p = IBasketFactory.BasketParams({
            name: s.name,
            symbol: s.symbol,
            comps: comps,
            targetBps: s.w,
            absBandBps: s.absBand,
            relBandBps: s.relBand,
            capBps: s.cap,
            feeBps: uint16(vm.envOr("FEE_BPS", uint256(100))),
            demo: s.demo,
            salt: keccak256(abi.encode("alloy-seed", vm.envOr("SALT_VERSION", string("v1")), s.symbol))
        });
        basket = factory.createBasket(p, s.seed, mins);
        console2.log(s.name, basket);
    }

    /// usdc6 -> token8 at the oracle price, minus slippage.
    function _minOut(address token, uint256 usdc6) internal view returns (uint256) {
        (, int256 a,,,) = IAggregatorV3(factory.tokenConfig(token).feed).latestRoundData();
        return usdc6 * 1e10 / uint256(a) * (10_000 - slip) / 10_000;
    }

    function _spec(
        string memory name,
        string memory symbol,
        string[] memory syms,
        uint16[] memory w,
        uint16 absBand,
        uint16 relBand,
        uint16 cap,
        bool demo,
        uint256 seed,
        string memory mode
    ) internal pure returns (Spec memory) {
        return Spec(name, symbol, syms, w, absBand, relBand, cap, demo, seed, mode);
    }

    function _s4(string memory a, string memory b, string memory c, string memory d)
        internal
        pure
        returns (string[] memory s)
    {
        s = new string[](4);
        (s[0], s[1], s[2], s[3]) = (a, b, c, d);
    }

    function _w4(uint16 a, uint16 b, uint16 c, uint16 d) internal pure returns (uint16[] memory w) {
        w = new uint16[](4);
        (w[0], w[1], w[2], w[3]) = (a, b, c, d);
    }
}
