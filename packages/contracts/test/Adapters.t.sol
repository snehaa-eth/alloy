// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {UniswapV3Adapter, IV3SwapRouter} from "../src/adapters/UniswapV3Adapter.sol";
import {AerodromeAdapter, IAeroRouter, ISlipstreamRouter} from "../src/adapters/AerodromeAdapter.sol";
import {SwapLib} from "../src/libraries/SwapLib.sol";
import {Basket} from "../src/Basket.sol";
import {MockVenue, MockSlipstream} from "./utils/MockRouters.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

contract LyingAdapter {
    function swap(address, address, uint256, uint256, address, bytes calldata) external pure returns (uint256) {
        return 1e30;
    }
}

/// @notice Encoding + hygiene tests for the venue adapters against recording mock routers.
contract AdaptersTest is Fixture {
    MockVenue internal venue;
    MockSlipstream internal cl;

    function setUp() public override {
        super.setUp();
        venue = new MockVenue();
        cl = new MockSlipstream();
        stocks[0].grantRole(B20Constants.MINT_ROLE, address(venue));
        stocks[0].grantRole(B20Constants.MINT_ROLE, address(cl));
    }

    function test_uniV3_encodesExactInputSingle() public {
        UniswapV3Adapter a = new UniswapV3Adapter(address(venue));
        venue.setOut(3e8);
        _mintUsdc(address(this), 300e6);
        uint256 got =
            SwapLib.swap(address(a), abi.encode(uint24(3000)), address(usdc), address(stocks[0]), 300e6, 2.9e8, asha);
        assertEq(got, 3e8);
        assertEq(stocks[0].balanceOf(asha), 3e8);
        IV3SwapRouter.ExactInputSingleParams memory p =
            abi.decode(venue.lastCall(), (IV3SwapRouter.ExactInputSingleParams));
        assertEq(p.tokenIn, address(usdc));
        assertEq(p.tokenOut, address(stocks[0]));
        assertEq(p.fee, 3000);
        assertEq(p.recipient, asha);
        assertEq(p.amountIn, 300e6);
        assertEq(p.amountOutMinimum, 2.9e8);
        assertEq(p.sqrtPriceLimitX96, 0);
        _assertClean(address(a));
    }

    function test_uniV3_minOutRevert() public {
        UniswapV3Adapter a = new UniswapV3Adapter(address(venue));
        venue.setOut(1e8);
        _mintUsdc(address(this), 300e6);
        vm.expectRevert("venue: minOut");
        this.extSwap(address(a), abi.encode(uint24(500)), 300e6, 2e8);
    }

    function test_aero_v2_encodesRoute() public {
        AerodromeAdapter a = new AerodromeAdapter(address(venue), address(cl));
        venue.setOut(1e8);
        _mintUsdc(address(this), 100e6);
        address pf = address(0xFAC);
        SwapLib.swap(
            address(a), abi.encode(uint8(0), false, pf, int24(0)), address(usdc), address(stocks[0]), 100e6, 1, asha
        );
        (uint256 amountIn, uint256 minOut, IAeroRouter.Route[] memory routes, address to, uint256 deadline) =
            abi.decode(venue.lastCall(), (uint256, uint256, IAeroRouter.Route[], address, uint256));
        assertEq(amountIn, 100e6);
        assertEq(minOut, 1);
        assertEq(routes.length, 1);
        assertEq(routes[0].from, address(usdc));
        assertEq(routes[0].to, address(stocks[0]));
        assertFalse(routes[0].stable);
        assertEq(routes[0].factory, pf);
        assertEq(to, asha);
        assertEq(deadline, block.timestamp);
        assertEq(stocks[0].balanceOf(asha), 1e8);
        _assertClean(address(a));
    }

    function test_aero_slipstream_encodesTickSpacing() public {
        AerodromeAdapter a = new AerodromeAdapter(address(venue), address(cl));
        cl.setOut(2e8);
        _mintUsdc(address(this), 200e6);
        SwapLib.swap(
            address(a),
            abi.encode(uint8(1), false, address(0), int24(100)),
            address(usdc),
            address(stocks[0]),
            200e6,
            2e8,
            asha
        );
        ISlipstreamRouter.ExactInputSingleParams memory p =
            abi.decode(cl.lastCall(), (ISlipstreamRouter.ExactInputSingleParams));
        assertEq(p.tickSpacing, 100);
        assertEq(p.recipient, asha);
        assertEq(p.amountIn, 200e6);
        assertEq(p.amountOutMinimum, 2e8);
        _assertClean(address(a));
    }

    function test_aero_unknownKind() public {
        AerodromeAdapter a = new AerodromeAdapter(address(venue), address(cl));
        _mintUsdc(address(this), 1e6);
        vm.expectRevert(abi.encodeWithSelector(AerodromeAdapter.UnknownKind.selector, uint8(7)));
        this.extSwap(address(a), abi.encode(uint8(7), false, address(0), int24(0)), 1e6, 0);
    }

    function test_swapLib_measuresBalanceDelta() public {
        // an adapter that reports a huge output but delivers nothing is caught by SwapLib
        LyingAdapter a = new LyingAdapter();
        _mintUsdc(address(this), 1e6);
        vm.expectRevert(abi.encodeWithSelector(SwapLib.InsufficientOutput.selector, 0, 6));
        this.extSwap(address(a), "", 1e6, 6);
    }

    /// @dev Full stack: Basket rebalance + Router through the real UniswapV3Adapter (venue mocked at oracle px).
    function test_basket_throughUniswapV3Adapter() public {
        // venue that fills at oracle price: reuse the MockSwapAdapter as the "router" via a thin shim is overkill;
        // instead check the factory->adapter wiring end to end for seed: 1 AAA per $100.
        UniswapV3Adapter a = new UniswapV3Adapter(address(venue));
        vm.prank(owner);
        factory.allow(address(stocks[0]), address(feeds[0]), address(a), abi.encode(uint24(3000)));
        venue.setOut(5e8);
        Basket b = _create(creator, _params2(0), 1000e6); // AAA leg $500 through UniswapV3Adapter
        (, uint256[] memory bals) = b.getBundle();
        assertEq(bals[0], 5e8);
        _assertClean(address(a));
    }

    function extSwap(address a, bytes calldata pd, uint256 amt, uint256 minOut) external {
        SwapLib.swap(a, pd, address(usdc), address(stocks[0]), amt, minOut, asha);
    }

    function _assertClean(address a) internal view {
        assertEq(usdc.balanceOf(a), 0);
        assertEq(stocks[0].balanceOf(a), 0);
        assertEq(usdc.allowance(a, address(venue)), 0);
        assertEq(usdc.allowance(a, address(cl)), 0);
        assertEq(usdc.allowance(address(this), a), 0);
    }
}
