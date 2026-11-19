// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BasketFactory} from "../src/BasketFactory.sol";
import {AlloyRouter} from "../src/AlloyRouter.sol";
import {Basket} from "../src/Basket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "../src/interfaces/IAggregatorV3.sol";

interface ICreatorsB20 {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

/// @notice Testnet demo world on Base Sepolia (84532): 3 independent creators, each with one basket, and 7 followers
///         who buy those baskets (and some house baskets) through AlloyRouter. The deployer funds every wallet with a
///         little ETH and mints the tUSDC each one needs (it holds MINT_ROLE on tUSDC, so no faucet cooldowns).
///
///   meera_invests  -> "Everyday Brands" aBRND  tAAPLc/tAMZNc/tGOOGLc 40/30/30  Keep the mix  (balanced 500/2500/10_000)
///   tunde.builds   -> "Chips & Cloud"   aCHIP  tNVDAc/tMSFTc/tAMZNc 45/30/25  Ride the trend (trend-aware: balanced
///                     bands + keeper policy; the web app shows it as trend-aware only with API tag "trend-aware")
///   lucia_longterm -> "EV & Energy"     aEVNR  tTSLAc/tNVDAc/tGOOGLc 40/35/25 Let winners run (10_000/10_000/4000)
///
/// Re-runnable: ETH/tUSDC top-ups only fill the gap, a basket is created only if its deterministic clone has no code,
/// and a follower buy is skipped if that follower already holds shares of that basket.
///
/// Keys come from env only (never written anywhere): DEPLOYER_PK (packages/testnet-env/.env) and
/// CREATOR_{1..3}_PK, FOLLOWER_{1..7}_PK (packages/testnet-env/.env.seed, gitignored).
///   set -a; source ../testnet-env/.env; source ../testnet-env/.env.seed; set +a
///   base-forge script script/SeedCreators.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --slow
/// Writes deployments/creators.84532.json (addresses, handles, recipes, follower counts; no keys).
/// Env (optional): SLIPPAGE_BPS (300), CREATOR_ETH (0.002 ether), FOLLOWER_ETH (0.001 ether), SALT_VERSION ("v1"),
///   CREATORS_OUT (deployments/creators.84532.json).
contract SeedCreators is Script {
    using stdJson for string;

    uint256 internal constant N_CREATORS = 3;
    uint256 internal constant N_FOLLOWERS = 7;

    struct Spec {
        string handle;
        string displayName;
        string name;
        string symbol;
        string style; // UI label
        string mode; // web StrategyMode
        string thesis;
        string[] syms;
        uint16[] w;
        uint16 absBand;
        uint16 relBand;
        uint16 cap;
        uint16 fee;
        uint256 stake; // tUSDC 6 dec
    }

    struct Buy {
        uint8 follower; // 0-based follower index
        address basket; // 0 => creator basket `creatorIdx`
        uint8 creatorIdx;
        uint256 usdc; // 6 dec
    }

    string internal envJson;
    BasketFactory internal factory;
    AlloyRouter internal router;
    address internal usdc;
    uint256 internal slip;

    address internal deployer;
    uint256[N_CREATORS] internal cPk;
    address[N_CREATORS] internal cAddr;
    uint256[N_FOLLOWERS] internal fPk;
    address[N_FOLLOWERS] internal fAddr;

    function run() external {
        require(block.chainid == 84532, "SeedCreators: chain 84532 (or a fork of it) only");
        envJson = vm.readFile("../testnet-env/deployments/84532.json");
        string memory dep = vm.readFile("deployments/84532.json");
        string memory house = vm.readFile("deployments/baskets.84532.json");
        factory = BasketFactory(dep.readAddress(".factory"));
        router = AlloyRouter(dep.readAddress(".router"));
        usdc = dep.readAddress(".usdc");
        slip = vm.envOr("SLIPPAGE_BPS", uint256(300));

        uint256 dPk = vm.envUint("DEPLOYER_PK");
        deployer = vm.addr(dPk);
        for (uint256 i; i < N_CREATORS; ++i) {
            cPk[i] = vm.envUint(string.concat("CREATOR_", vm.toString(i + 1), "_PK"));
            cAddr[i] = vm.addr(cPk[i]);
        }
        for (uint256 i; i < N_FOLLOWERS; ++i) {
            fPk[i] = vm.envUint(string.concat("FOLLOWER_", vm.toString(i + 1), "_PK"));
            fAddr[i] = vm.addr(fPk[i]);
        }

        Spec[] memory specs = _specs();
        address[] memory baskets = new address[](N_CREATORS);
        for (uint256 i; i < N_CREATORS; ++i) {
            baskets[i] = factory.predictBasket(cAddr[i], _salt(specs[i].symbol));
        }

        // House baskets that should not sit at 0 followers.
        address aiw = 0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3; // "The AI Build-Out" (Let winners run, featured)
        address bigt = house.readAddress(".aBIGT.address");
        address conv = house.readAddress(".aCONV.address");

        Buy[] memory buys = new Buy[](14);
        // Everyday Brands: 3 followers
        buys[0] = Buy(0, address(0), 0, 25e6);
        buys[1] = Buy(1, address(0), 0, 40e6);
        buys[2] = Buy(2, address(0), 0, 15e6);
        // Chips & Cloud: 4 followers
        buys[3] = Buy(1, address(0), 1, 60e6);
        buys[4] = Buy(3, address(0), 1, 35e6);
        buys[5] = Buy(4, address(0), 1, 20e6);
        buys[6] = Buy(5, address(0), 1, 12e6);
        // EV & Energy: 2 followers
        buys[7] = Buy(2, address(0), 2, 30e6);
        buys[8] = Buy(6, address(0), 2, 18e6);
        // House baskets
        buys[9] = Buy(0, aiw, 0, 50e6);
        buys[10] = Buy(4, aiw, 0, 22e6);
        buys[11] = Buy(5, aiw, 0, 15e6);
        buys[12] = Buy(3, bigt, 0, 30e6);
        buys[13] = Buy(6, conv, 0, 45e6);
        for (uint256 k; k < buys.length; ++k) {
            if (buys[k].basket == address(0)) buys[k].basket = baskets[buys[k].creatorIdx];
        }

        // ---- 1. deployer: ETH + tUSDC top-ups (only the gap)
        uint256[N_FOLLOWERS] memory fNeed;
        for (uint256 k; k < buys.length; ++k) {
            fNeed[buys[k].follower] += buys[k].usdc;
        }
        vm.startBroadcast(dPk);
        uint256 cEth = vm.envOr("CREATOR_ETH", uint256(0.002 ether));
        uint256 fEth = vm.envOr("FOLLOWER_ETH", uint256(0.001 ether));
        for (uint256 i; i < N_CREATORS; ++i) {
            _topUp(cAddr[i], cEth, baskets[i].code.length == 0 ? specs[i].stake : 0);
        }
        for (uint256 i; i < N_FOLLOWERS; ++i) {
            uint256 need;
            for (uint256 k; k < buys.length; ++k) {
                if (buys[k].follower == i && _bal(buys[k].basket, fAddr[i]) == 0) need += buys[k].usdc;
            }
            _topUp(fAddr[i], fEth, need);
        }
        vm.stopBroadcast();

        // ---- 2. creators: one basket each
        for (uint256 i; i < N_CREATORS; ++i) {
            if (baskets[i].code.length != 0) {
                console2.log("exists", specs[i].name, baskets[i]);
                continue;
            }
            vm.startBroadcast(cPk[i]);
            ICreatorsB20(usdc).approve(address(factory), specs[i].stake);
            address b = _create(specs[i]);
            vm.stopBroadcast();
            require(b == baskets[i], "SeedCreators: unexpected basket address");
            console2.log("created", specs[i].name, b);
        }

        // ---- 3. followers buy through the router
        for (uint256 k; k < buys.length; ++k) {
            Buy memory bu = buys[k];
            address who = fAddr[bu.follower];
            if (_bal(bu.basket, who) != 0) {
                console2.log("skip (already holds)", who, bu.basket);
                continue;
            }
            uint256[] memory mins = _buyMins(bu.basket, bu.usdc);
            vm.startBroadcast(fPk[bu.follower]);
            ICreatorsB20(usdc).approve(address(router), bu.usdc);
            uint256 shares = router.buy(bu.basket, bu.usdc, mins, 1);
            vm.stopBroadcast();
            console2.log("bought", who, bu.basket, shares);
        }

        _writeJson(specs, baskets, buys);
    }

    // ------------------------------------------------------------------ steps

    function _bal(address basket, address who) internal view returns (uint256) {
        return basket.code.length == 0 ? 0 : ICreatorsB20(basket).balanceOf(who);
    }

    function _topUp(address to, uint256 eth, uint256 usdcNeed) internal {
        if (to.balance < eth) payable(to).transfer(eth - to.balance);
        uint256 bal = ICreatorsB20(usdc).balanceOf(to);
        if (bal < usdcNeed) ICreatorsB20(usdc).mint(to, usdcNeed - bal);
    }

    function _create(Spec memory s) internal returns (address basket) {
        uint256 n = s.syms.length;
        address[] memory comps = new address[](n);
        uint256[] memory mins = new uint256[](n);
        uint256 spent;
        for (uint256 i; i < n; ++i) {
            comps[i] = _token(s.syms[i]);
            uint256 slice = i == n - 1 ? s.stake - spent : s.stake * s.w[i] / 10_000;
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
            feeBps: s.fee,
            demo: false,
            salt: _salt(s.symbol)
        });
        basket = factory.createBasket(p, s.stake, mins);
    }

    function _buyMins(address basket, uint256 usdcIn) internal view returns (uint256[] memory mins) {
        uint256[] memory slices = router.splitUsdc(basket, usdcIn);
        (address[] memory comps,) = Basket(basket).getBundle();
        mins = new uint256[](comps.length);
        for (uint256 i; i < comps.length; ++i) {
            mins[i] = slices[i] == 0 ? 0 : _minOut(comps[i], slices[i]);
        }
    }

    /// usdc6 -> token8 at the oracle price, minus slippage.
    function _minOut(address token, uint256 usdc6) internal view returns (uint256) {
        (, int256 a,,,) = IAggregatorV3(factory.tokenConfig(token).feed).latestRoundData();
        return usdc6 * 1e10 / uint256(a) * (10_000 - slip) / 10_000;
    }

    function _token(string memory sym) internal view returns (address) {
        return envJson.readAddress(string.concat(".stocks.", sym, ".token"));
    }

    function _salt(string memory symbol) internal view returns (bytes32) {
        return keccak256(abi.encode("alloy-creators", vm.envOr("SALT_VERSION", string("v1")), symbol));
    }

    // ------------------------------------------------------------------ recipes

    function _specs() internal pure returns (Spec[] memory s) {
        s = new Spec[](N_CREATORS);
        s[0] = Spec({
            handle: "meera_invests",
            displayName: "Meera R.",
            name: "Everyday Brands",
            symbol: "aBRND",
            style: "Keep the mix",
            mode: "balanced",
            thesis: "Companies you already pay every week: phones, parcels, search.",
            syms: _s3("tAAPLc", "tAMZNc", "tGOOGLc"),
            w: _w3(4000, 3000, 3000),
            absBand: 500,
            relBand: 2500,
            cap: 10_000,
            fee: 75,
            stake: 250e6
        });
        s[1] = Spec({
            handle: "tunde.builds",
            displayName: "Tunde A.",
            name: "Chips & Cloud",
            symbol: "aCHIP",
            style: "Ride the trend",
            mode: "trend-aware",
            thesis: "The chips and cloud servers every AI app runs on.",
            syms: _s3("tNVDAc", "tMSFTc", "tAMZNc"),
            w: _w3(4500, 3000, 2500),
            absBand: 500,
            relBand: 2500,
            cap: 10_000,
            fee: 100,
            stake: 400e6
        });
        s[2] = Spec({
            handle: "lucia_longterm",
            displayName: "Lucia M.",
            name: "EV & Energy",
            symbol: "aEVNR",
            style: "Let winners run",
            mode: "let-winners-run",
            thesis: "Electric cars, the chips inside them, and self-driving software.",
            syms: _s3("tTSLAc", "tNVDAc", "tGOOGLc"),
            w: _w3(4000, 3500, 2500),
            absBand: 10_000,
            relBand: 10_000,
            cap: 4000,
            fee: 150,
            stake: 150e6
        });
    }

    function _s3(string memory a, string memory b, string memory c) internal pure returns (string[] memory s) {
        s = new string[](3);
        (s[0], s[1], s[2]) = (a, b, c);
    }

    function _w3(uint16 a, uint16 b, uint16 c) internal pure returns (uint16[] memory w) {
        w = new uint16[](3);
        (w[0], w[1], w[2]) = (a, b, c);
    }

    // ------------------------------------------------------------------ output

    /// Followers = seeded follower wallets holding > 0 shares (what the web app counts, minus treasury fee mints).
    function _followers(address basket) internal view returns (uint256 n) {
        for (uint256 i; i < N_FOLLOWERS; ++i) {
            if (ICreatorsB20(basket).balanceOf(fAddr[i]) != 0) ++n;
        }
    }

    function _writeJson(Spec[] memory specs, address[] memory baskets, Buy[] memory buys) internal {
        string memory root = "creators";
        for (uint256 i; i < N_CREATORS; ++i) {
            string memory k = specs[i].symbol;
            Basket b = Basket(baskets[i]);
            vm.serializeString(k, "handle", specs[i].handle);
            vm.serializeString(k, "displayName", specs[i].displayName);
            vm.serializeAddress(k, "creator", cAddr[i]);
            vm.serializeAddress(k, "basket", baskets[i]);
            vm.serializeString(k, "name", specs[i].name);
            vm.serializeString(k, "symbol", specs[i].symbol);
            vm.serializeString(k, "style", specs[i].style);
            vm.serializeString(k, "mode", specs[i].mode);
            vm.serializeString(k, "thesis", specs[i].thesis);
            vm.serializeString(k, "stocks", specs[i].syms);
            uint256[] memory w = new uint256[](specs[i].w.length);
            for (uint256 j; j < w.length; ++j) {
                w[j] = specs[i].w[j];
            }
            vm.serializeUint(k, "targetBps", w);
            vm.serializeUint(k, "feeBps", specs[i].fee);
            vm.serializeUint(k, "stakeUsdc6", specs[i].stake);
            vm.serializeUint(k, "creatorShares", b.balanceOf(cAddr[i]));
            vm.serializeUint(k, "totalSupply", b.totalSupply());
            vm.serializeUint(k, "navUsd8", b.nav());
            string memory obj = vm.serializeUint(k, "followers", _followers(baskets[i]));
            vm.serializeString(root, specs[i].symbol, obj);
        }

        string memory fRoot = "followers";
        string memory fJson;
        for (uint256 i; i < N_FOLLOWERS; ++i) {
            string memory k = string.concat("follower_", vm.toString(i + 1));
            uint256 cnt;
            for (uint256 j; j < buys.length; ++j) {
                if (buys[j].follower == i) ++cnt;
            }
            address[] memory bs = new address[](cnt);
            uint256[] memory amts = new uint256[](cnt);
            uint256[] memory shares = new uint256[](cnt);
            uint256 m;
            for (uint256 j; j < buys.length; ++j) {
                if (buys[j].follower != i) continue;
                bs[m] = buys[j].basket;
                amts[m] = buys[j].usdc;
                shares[m] = ICreatorsB20(buys[j].basket).balanceOf(fAddr[i]);
                ++m;
            }
            vm.serializeAddress(k, "address", fAddr[i]);
            vm.serializeAddress(k, "baskets", bs);
            vm.serializeUint(k, "usdc6", amts);
            string memory o = vm.serializeUint(k, "shares", shares);
            fJson = vm.serializeString(fRoot, k, o);
        }

        string memory hRoot = "house";
        address[3] memory hb = [buys[9].basket, buys[12].basket, buys[13].basket];
        string memory hJson;
        for (uint256 i; i < 3; ++i) {
            hJson = vm.serializeUint(hRoot, vm.toString(hb[i]), _followers(hb[i]));
        }

        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "factory", address(factory));
        vm.serializeAddress(root, "router", address(router));
        vm.serializeString(root, "note", "Testnet demo creators. No keys here; keys live in packages/testnet-env/.env.seed (gitignored).");
        vm.serializeString(root, "followerList", fJson);
        string memory json = vm.serializeString(root, "houseBasketSeededFollowers", hJson);
        console2.log("CREATORS_JSON");
        console2.log(json);
        vm.writeJson(json, vm.envOr("CREATORS_OUT", string("deployments/creators.84532.json")));
    }
}
