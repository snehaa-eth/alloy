// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {MockFeedPauseRegistry} from "../src/MockFeedPauseRegistry.sol";
import {Faucet} from "../src/Faucet.sol";
import {PriceMath} from "../src/lib/PriceMath.sol";
import {IUniswapV3Factory, IUniswapV3Pool, INonfungiblePositionManager} from "../src/interfaces/IUniswapV3.sol";

/// @title DeployTestnet
/// @notice Builds Alloy's Base Sepolia "testnet world":
///         tUSDC (B20 STABLECOIN, 6 dec) + 6 test stocks (B20 ASSET, 8 dec), one MockPriceFeed per stock seeded from
///         config/prices.json, a feed pause registry, Uniswap v3 stock/tUSDC pools with liquidity, and a tUSDC faucet.
///         Writes every address to deployments/<chainId>.json (override with DEPLOYMENTS_OUT).
///
/// Env (all optional except a signer when broadcasting):
///   DEPLOYER_PK     private key used by vm.startBroadcast (if unset, uses --sender / --unlocked / --account)
///   BOT_ADDRESS     price-sync bot address; gets MINT_ROLE on all tokens + updater on all feeds (default deployer)
///   LIQUIDITY_USD   USD per side per pool (default 250000)
///   RANGE_TICKS     half-width of the LP range in ticks around the spot tick (default 11000 ~= price/3..price*3);
///                   0 = full range
///   FEE_TIER        Uniswap v3 fee tier (default 500 = 0.05%, tick spacing 10)
///   SALT_VERSION    string mixed into the B20 salts (default "v1"); bump to deploy a fresh set
///   FAUCET_DRIP     tUSDC per drip in whole units (default 1000)
///   PRICES_FILE     default config/prices.json
///   DEPLOYMENTS_OUT default deployments/<chainId>.json
contract DeployTestnet is Script {
    // ---- Base Sepolia (84532) Uniswap v3, verified on-chain 2026-11-19 ----
    address internal constant UNI_V3_FACTORY = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
    address internal constant UNI_V3_NPM = 0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2;
    address internal constant UNI_SWAP_ROUTER02 = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address internal constant UNI_QUOTER_V2 = 0xC5290058841028F1614F3A6F0F5816cAd0df5E27;

    uint8 internal constant STOCK_DECIMALS = 8;
    uint8 internal constant USDC_DECIMALS = 6;
    uint8 internal constant FEED_DECIMALS = 8;

    struct Stock {
        string symbol; // tNVDAc
        string name; // Test NVIDIA (Alloy)
        string ticker; // NVDA  (key in prices.json)
    }

    struct Deployed {
        address token;
        address feed;
        address pool;
        uint256 positionId;
        uint128 liquidity;
        bool stockIsToken0;
        uint256 answer;
        int24 tickLower;
        int24 tickUpper;
    }

    address internal deployer;
    address internal bot;
    uint24 internal feeTier;
    string internal saltVersion;

    function stocks() public pure returns (Stock[] memory s) {
        s = new Stock[](6);
        s[0] = Stock("tNVDAc", "Alloy Test NVIDIA", "NVDA");
        s[1] = Stock("tGOOGLc", "Alloy Test Alphabet", "GOOGL");
        s[2] = Stock("tMSFTc", "Alloy Test Microsoft", "MSFT");
        s[3] = Stock("tTSLAc", "Alloy Test Tesla", "TSLA");
        s[4] = Stock("tAAPLc", "Alloy Test Apple", "AAPL");
        s[5] = Stock("tAMZNc", "Alloy Test Amazon", "AMZN");
    }

    function run() external {
        uint256 pk = vm.envOr("DEPLOYER_PK", uint256(0));
        if (pk != 0) {
            deployer = vm.addr(pk);
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
            (, deployer,) = vm.readCallers();
        }
        bot = vm.envOr("BOT_ADDRESS", deployer);
        feeTier = uint24(vm.envOr("FEE_TIER", uint256(500)));
        saltVersion = vm.envOr("SALT_VERSION", string("v1"));
        uint256 liquidityUsd = vm.envOr("LIQUIDITY_USD", uint256(250_000));
        uint256 rangeTicks = vm.envOr("RANGE_TICKS", uint256(11_000));
        uint256 dripWhole = vm.envOr("FAUCET_DRIP", uint256(1_000));

        string memory pricesJson = vm.readFile(vm.envOr("PRICES_FILE", string("config/prices.json")));
        _checkPriceFreshness(pricesJson);

        console2.log("deployer", deployer);
        console2.log("bot     ", bot);
        console2.log("chainId ", block.chainid);

        // ---------------- tUSDC ----------------
        address usdc = _createUsdc();
        console2.log("tUSDC   ", usdc);

        // ---------------- registry + faucet ----------------
        MockFeedPauseRegistry registry = new MockFeedPauseRegistry(deployer);
        if (bot != deployer) registry.setPauser(bot, true);
        Faucet faucet = new Faucet(deployer, usdc, dripWhole * 10 ** USDC_DECIMALS);
        IB20(usdc).grantRole(B20Constants.MINT_ROLE, address(faucet));
        console2.log("registry", address(registry));
        console2.log("faucet  ", address(faucet));

        // ---------------- stocks, feeds, pools ----------------
        Stock[] memory s = stocks();
        Deployed[] memory d = new Deployed[](s.length);
        int24 spacing = IUniswapV3Factory(UNI_V3_FACTORY).feeAmountTickSpacing(feeTier);
        require(spacing != 0, "fee tier not enabled");

        for (uint256 i; i < s.length; ++i) {
            uint256 answer = vm.parseJsonUint(pricesJson, string.concat(".prices.", s[i].ticker));
            require(answer > 0, "missing price");
            d[i].answer = answer;
            d[i].token = _createStock(s[i]);

            MockPriceFeed feed =
                new MockPriceFeed(string.concat(s[i].symbol, " / USD"), deployer, int256(answer));
            feed.setUpdater(address(registry), true);
            if (bot != deployer) feed.setUpdater(bot, true);
            d[i].feed = address(feed);

            _createPoolAndSeed(d[i], usdc, liquidityUsd, rangeTicks, spacing);
            console2.log(s[i].symbol, d[i].token, d[i].feed, d[i].pool);
        }
        vm.stopBroadcast();

        _write(s, d, usdc, address(registry), address(faucet), liquidityUsd, spacing);
    }

    /*//////////////////////////////////////////////////////////////
                                  B20
    //////////////////////////////////////////////////////////////*/

    function _salt(string memory symbol) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("alloy.testnet.", symbol, ".", saltVersion));
    }

    function _roleCalls(bool asset) internal view returns (bytes[] memory calls) {
        uint256 n = asset ? 2 : 1;
        if (bot != deployer) n += 1;
        calls = new bytes[](n);
        uint256 k;
        calls[k++] = abi.encodeCall(IB20.grantRole, (B20Constants.MINT_ROLE, deployer));
        if (asset) calls[k++] = abi.encodeCall(IB20.grantRole, (B20Constants.OPERATOR_ROLE, deployer));
        if (bot != deployer) calls[k++] = abi.encodeCall(IB20.grantRole, (B20Constants.MINT_ROLE, bot));
    }

    function _createUsdc() internal returns (address token) {
        bytes memory params = abi.encode(
            IB20Factory.B20StablecoinCreateParams({
                version: 1, name: "Alloy Test USDC", symbol: "tUSDC", initialAdmin: deployer, currency: "USD"
            })
        );
        token = StdPrecompiles.B20_FACTORY
            .createB20(IB20Factory.B20Variant.STABLECOIN, _salt("tUSDC"), params, _roleCalls(false));
        require(IB20(token).decimals() == USDC_DECIMALS, "tUSDC decimals");
    }

    function _createStock(Stock memory st) internal returns (address token) {
        bytes memory params = abi.encode(
            IB20Factory.B20AssetCreateParams({
                version: 1, name: st.name, symbol: st.symbol, initialAdmin: deployer, decimals: STOCK_DECIMALS
            })
        );
        token =
            StdPrecompiles.B20_FACTORY.createB20(IB20Factory.B20Variant.ASSET, _salt(st.symbol), params, _roleCalls(true));
        require(IB20(token).decimals() == STOCK_DECIMALS, "stock decimals");
    }

    /*//////////////////////////////////////////////////////////////
                                UNISWAP
    //////////////////////////////////////////////////////////////*/

    function _createPoolAndSeed(
        Deployed memory d,
        address usdc,
        uint256 liquidityUsd,
        uint256 rangeTicks,
        int24 spacing
    ) internal {
        bool stockIs0 = d.token < usdc;
        d.stockIsToken0 = stockIs0;
        (address t0, address t1) = stockIs0 ? (d.token, usdc) : (usdc, d.token);

        uint160 sqrtP = PriceMath.sqrtPriceX96FromAnswer(d.answer, FEED_DECIMALS, STOCK_DECIMALS, USDC_DECIMALS, stockIs0);
        d.pool = INonfungiblePositionManager(UNI_V3_NPM).createAndInitializePoolIfNecessary(t0, t1, feeTier, sqrtP);

        (, int24 tick,,,,,) = IUniswapV3Pool(d.pool).slot0();
        if (rangeTicks == 0) {
            (d.tickLower, d.tickUpper) = PriceMath.fullRange(spacing);
        } else {
            int24 r = int24(int256(rangeTicks));
            d.tickLower = PriceMath.floorTick(tick - r, spacing);
            d.tickUpper = PriceMath.floorTick(tick + r, spacing) + spacing;
        }

        _seed(d, usdc, liquidityUsd, t0, t1);
    }

    function _seed(Deployed memory d, address usdc, uint256 liquidityUsd, address t0, address t1) internal {
        // stock raw = usd * 1e8 / price = usd * 1e8 * 1e8 / answer ; usdc raw = usd * 1e6
        uint256 stockAmt = liquidityUsd * 10 ** STOCK_DECIMALS * 10 ** FEED_DECIMALS / d.answer;
        uint256 usdcAmt = liquidityUsd * 10 ** USDC_DECIMALS;
        IB20(d.token).mint(deployer, stockAmt);
        IB20(usdc).mint(deployer, usdcAmt);
        IB20(d.token).approve(UNI_V3_NPM, stockAmt);
        IB20(usdc).approve(UNI_V3_NPM, usdcAmt);

        INonfungiblePositionManager.MintParams memory mp;
        mp.token0 = t0;
        mp.token1 = t1;
        mp.fee = feeTier;
        mp.tickLower = d.tickLower;
        mp.tickUpper = d.tickUpper;
        (mp.amount0Desired, mp.amount1Desired) = d.stockIsToken0 ? (stockAmt, usdcAmt) : (usdcAmt, stockAmt);
        mp.recipient = deployer;
        mp.deadline = block.timestamp + 1 hours;
        (d.positionId, d.liquidity,,) = INonfungiblePositionManager(UNI_V3_NPM).mint(mp);

        // Leave no dangling allowance (any unused remainder stays with the deployer as inventory).
        IB20(d.token).approve(UNI_V3_NPM, 0);
        IB20(usdc).approve(UNI_V3_NPM, 0);
    }

    /*//////////////////////////////////////////////////////////////
                                 OUTPUT
    //////////////////////////////////////////////////////////////*/

    function _checkPriceFreshness(string memory json) internal view {
        uint256 fetchedAt = vm.parseJsonUint(json, ".fetchedAtUnix");
        if (block.timestamp > fetchedAt + 3 days) {
            console2.log("WARNING: config/prices.json is older than 3 days; run `pnpm -C bot prices` first");
        }
    }

    function _write(
        Stock[] memory s,
        Deployed[] memory d,
        address usdc,
        address registry,
        address faucet,
        uint256 liquidityUsd,
        int24 spacing
    ) internal {
        string memory stocksObj = "stocks";
        string memory stocksJson;
        for (uint256 i; i < s.length; ++i) {
            string memory k = s[i].symbol;
            vm.serializeString(k, "symbol", s[i].symbol);
            vm.serializeString(k, "name", s[i].name);
            vm.serializeString(k, "underlying", s[i].ticker);
            vm.serializeUint(k, "decimals", STOCK_DECIMALS);
            vm.serializeAddress(k, "token", d[i].token);
            vm.serializeAddress(k, "feed", d[i].feed);
            vm.serializeAddress(k, "pool", d[i].pool);
            vm.serializeBool(k, "stockIsToken0", d[i].stockIsToken0);
            vm.serializeUint(k, "positionId", d[i].positionId);
            vm.serializeUint(k, "liquidity", d[i].liquidity);
            vm.serializeInt(k, "tickLower", d[i].tickLower);
            vm.serializeInt(k, "tickUpper", d[i].tickUpper);
            string memory one = vm.serializeUint(k, "initialAnswer", d[i].answer);
            stocksJson = vm.serializeString(stocksObj, s[i].symbol, one);
        }

        string memory u = "uniswap";
        vm.serializeAddress(u, "factory", UNI_V3_FACTORY);
        vm.serializeAddress(u, "positionManager", UNI_V3_NPM);
        vm.serializeAddress(u, "swapRouter02", UNI_SWAP_ROUTER02);
        vm.serializeAddress(u, "quoterV2", UNI_QUOTER_V2);
        vm.serializeUint(u, "feeTier", feeTier);
        string memory uniJson = vm.serializeInt(u, "tickSpacing", spacing);

        string memory c = "usdc";
        vm.serializeString(c, "symbol", "tUSDC");
        vm.serializeUint(c, "decimals", USDC_DECIMALS);
        string memory usdcJson = vm.serializeAddress(c, "token", usdc);

        string memory r = "root";
        vm.serializeUint(r, "chainId", block.chainid);
        vm.serializeAddress(r, "deployer", deployer);
        vm.serializeAddress(r, "bot", bot);
        vm.serializeUint(r, "deployedAtBlock", block.number);
        vm.serializeUint(r, "deployedAt", block.timestamp);
        vm.serializeString(r, "saltVersion", saltVersion);
        vm.serializeAddress(r, "b20Factory", address(StdPrecompiles.B20_FACTORY));
        vm.serializeAddress(r, "feedPauseRegistry", registry);
        vm.serializeAddress(r, "faucet", faucet);
        vm.serializeUint(r, "liquidityUsdPerSide", liquidityUsd);
        vm.serializeUint(r, "feedDecimals", FEED_DECIMALS);
        vm.serializeString(r, "uniswap", uniJson);
        vm.serializeString(r, "usdc", usdcJson);
        string memory out = vm.serializeString(r, "stocks", stocksJson);

        string memory path = vm.envOr(
            "DEPLOYMENTS_OUT", string.concat("deployments/", vm.toString(block.chainid), ".json")
        );
        vm.writeJson(out, path);
        console2.log("wrote", path);
    }
}
