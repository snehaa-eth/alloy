// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

import {DeployTestnet} from "../script/DeployTestnet.s.sol";
import {CorporateAction} from "../script/CorporateAction.s.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {MockFeedPauseRegistry} from "../src/MockFeedPauseRegistry.sol";
import {Faucet} from "../src/Faucet.sol";
import {PriceMath} from "../src/lib/PriceMath.sol";
import {IUniswapV3Pool, ISwapRouter02} from "../src/interfaces/IUniswapV3.sol";

/// @notice End-to-end: runs the real deploy script against a Base Sepolia fork (B20 precompiles in-process via
///         base-forge, real Uniswap v3 periphery), then exercises faucet -> swap -> arb -> corporate action.
/// @dev Opt-in (needs network): FORK_TESTS=true base-forge test --match-contract TestnetWorldForkTest
contract TestnetWorldForkTest is Test {
    string constant OUT = "deployments/84532-forktest-local.json";
    address constant ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;

    string json;
    address deployer;
    IB20 usdc;
    Faucet faucet;
    MockFeedPauseRegistry registry;

    string[6] SYMS = ["tNVDAc", "tGOOGLc", "tMSFTc", "tTSLAc", "tAAPLc", "tAMZNc"];

    function setUp() public {
        if (!vm.envOr("FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("FORK_URL", string("https://sepolia.base.org")));
        vm.setEnv("DEPLOYMENTS_OUT", OUT);
        vm.setEnv("DEPLOYMENTS", OUT);
        vm.setEnv("SALT_VERSION", string.concat("forktest-", vm.toString(block.timestamp)));
        new DeployTestnet().run();

        json = vm.readFile(OUT);
        deployer = vm.parseJsonAddress(json, ".deployer");
        usdc = IB20(vm.parseJsonAddress(json, ".usdc.token"));
        faucet = Faucet(vm.parseJsonAddress(json, ".faucet"));
        registry = MockFeedPauseRegistry(vm.parseJsonAddress(json, ".feedPauseRegistry"));
    }

    function _addr(string memory sym, string memory field) internal view returns (address) {
        return vm.parseJsonAddress(json, string.concat(".stocks.", sym, ".", field));
    }

    function _poolAnswer(string memory sym) internal view returns (uint256) {
        (uint160 sp,,,,,,) = IUniswapV3Pool(_addr(sym, "pool")).slot0();
        bool s0 = vm.parseJsonBool(json, string.concat(".stocks.", sym, ".stockIsToken0"));
        return PriceMath.answerFromSqrtPriceX96(sp, 8, 8, 6, s0);
    }

    function _feedAnswer(string memory sym) internal view returns (uint256) {
        (, int256 a,,,) = MockPriceFeed(_addr(sym, "feed")).latestRoundData();
        return uint256(a);
    }

    function test_world_isConsistent() public view {
        assertEq(usdc.decimals(), 6);
        assertTrue(usdc.hasRole(B20Constants.MINT_ROLE, address(faucet)));
        for (uint256 i; i < SYMS.length; ++i) {
            IB20 t = IB20(_addr(SYMS[i], "token"));
            assertEq(t.decimals(), 8);
            assertEq(t.symbol(), SYMS[i]);
            assertTrue(t.hasRole(B20Constants.MINT_ROLE, deployer));
            assertTrue(t.hasRole(B20Constants.OPERATOR_ROLE, deployer));
            uint256 f = _feedAnswer(SYMS[i]);
            uint256 p = _poolAnswer(SYMS[i]);
            assertApproxEqRel(p, f, 0.0001e18, "pool price within 1bp of feed");
            assertGt(IUniswapV3Pool(_addr(SYMS[i], "pool")).liquidity(), 0);
            // ~$250k of each side in the pool
            uint256 usdcInPool = usdc.balanceOf(_addr(SYMS[i], "pool"));
            assertApproxEqRel(usdcInPool, 250_000e6, 0.01e18);
        }
    }

    function test_judgeFlow_faucetThenBuy() public {
        address judge = makeAddr("judge");
        vm.prank(judge);
        faucet.drip();
        assertEq(usdc.balanceOf(judge), 1_000e6);

        IB20 nvda = IB20(_addr("tNVDAc", "token"));
        vm.startPrank(judge);
        usdc.approve(ROUTER, 1_000e6);
        uint256 out = ISwapRouter02(ROUTER).exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: address(usdc),
                tokenOut: address(nvda),
                fee: 500,
                recipient: judge,
                amountIn: 1_000e6,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        vm.stopPrank();
        // $1000 / price, minus 5bp fee and ~0.17% impact (constant-product-ish depth ~ $590k/side in range)
        uint256 fair = 1_000e6 * 1e10 / _feedAnswer("tNVDAc"); // usd * 1e16 / answer
        assertApproxEqRel(out, fair, 0.005e18);
        assertEq(nvda.balanceOf(judge), out);
    }

    function test_arbBackToFeed() public {
        // Scenario: GOOGL +20% on the feed, then arb with minted tokens and a sqrtPrice limit (what the bot does).
        string memory sym = "tGOOGLc";
        MockPriceFeed feed = MockPriceFeed(_addr(sym, "feed"));
        uint256 target = _feedAnswer(sym) * 12 / 10;
        vm.prank(deployer);
        feed.updateAnswer(int256(target));

        bool s0 = vm.parseJsonBool(json, string.concat(".stocks.", sym, ".stockIsToken0"));
        uint160 limit = PriceMath.sqrtPriceX96FromAnswer(target, 8, 8, 6, s0);
        // price up => buy stock with USDC
        vm.startPrank(deployer);
        usdc.mint(deployer, 200_000e6);
        usdc.approve(ROUTER, 200_000e6);
        ISwapRouter02(ROUTER).exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: address(usdc),
                tokenOut: _addr(sym, "token"),
                fee: 500,
                recipient: deployer,
                amountIn: 200_000e6,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: limit
            })
        );
        vm.stopPrank();
        assertApproxEqRel(_poolAnswer(sym), target, 0.001e18, "pool within 0.1% of feed");
    }

    function test_corporateAction_split() public {
        string memory sym = "tTSLAc";
        IB20Asset t = IB20Asset(_addr(sym, "token"));
        uint256 before = _feedAnswer(sym);
        vm.setEnv("SYMBOL", sym);
        vm.setEnv("RATIO_NUM", "2");
        vm.setEnv("RATIO_DEN", "1");

        CorporateAction ca = new CorporateAction();
        bool cobalt = ca.supportsScheduledMultiplier(address(t));

        // schedule: feed paused for the window
        vm.setEnv("ACTION", "schedule");
        ca.run();
        assertTrue(registry.isOraclePaused(_addr(sym, "feed")));

        vm.warp(block.timestamp + 601);
        vm.setEnv("ACTION", "execute");
        ca.run();
        assertFalse(registry.isOraclePaused(_addr(sym, "feed")));
        assertEq(cobalt ? t.uiMultiplier() : t.multiplier(), 2e18);
        // per-raw-token price unchanged (Chainlink semantics), fresh round pushed
        assertEq(_feedAnswer(sym), before);
        (,,, uint256 updatedAt,) = MockPriceFeed(_addr(sym, "feed")).latestRoundData();
        assertEq(updatedAt, block.timestamp);
    }
}
