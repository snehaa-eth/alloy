// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {PriceMath} from "../src/lib/PriceMath.sol";

contract PriceMathTest is Test {
    uint256 constant Q96 = 1 << 96;

    function test_hundredDollars_isUnitRawPrice() public pure {
        // $100 for an 8-dec stock vs 6-dec USDC => 1e8 raw stock = 100e6 raw USDC => raw price exactly 1.0
        assertEq(PriceMath.sqrtPriceX96FromAnswer(100e8, 8, 8, 6, true), Q96);
        assertEq(PriceMath.sqrtPriceX96FromAnswer(100e8, 8, 8, 6, false), Q96);
    }

    function test_fourHundredDollars() public pure {
        // raw price 4 => sqrt 2
        assertEq(PriceMath.sqrtPriceX96FromAnswer(400e8, 8, 8, 6, true), 2 * Q96);
        // inverse ordering: raw price 1/4 => sqrt 1/2
        assertEq(PriceMath.sqrtPriceX96FromAnswer(400e8, 8, 8, 6, false), Q96 / 2);
    }

    function testFuzz_roundTrip(uint256 answer, bool stockIs0) public pure {
        answer = bound(answer, 1e6, 1e14); // $0.01 .. $1M
        uint160 sp = PriceMath.sqrtPriceX96FromAnswer(answer, 8, 8, 6, stockIs0);
        uint256 back = PriceMath.answerFromSqrtPriceX96(sp, 8, 8, 6, stockIs0);
        uint256 diff = back > answer ? back - answer : answer - back;
        assertLe(diff * 1e6, answer, "round trip within 1ppm");
    }

    function test_sqrt() public pure {
        assertEq(PriceMath.sqrt(0), 0);
        assertEq(PriceMath.sqrt(1), 1);
        assertEq(PriceMath.sqrt(2), 1);
        assertEq(PriceMath.sqrt(4), 2);
        assertEq(PriceMath.sqrt(type(uint256).max), type(uint128).max);
    }

    function testFuzz_sqrt(uint256 x) public pure {
        uint256 r = PriceMath.sqrt(x);
        assertLe(r * r, x);
        if (r < type(uint128).max) assertGt((r + 1) * (r + 1), x);
    }

    function test_floorTick() public pure {
        assertEq(PriceMath.floorTick(15, 10), 10);
        assertEq(PriceMath.floorTick(-15, 10), -20);
        assertEq(PriceMath.floorTick(-20, 10), -20);
        assertEq(PriceMath.floorTick(0, 60), 0);
        assertEq(PriceMath.floorTick(-900000, 10), -887270);
        assertEq(PriceMath.floorTick(900000, 10), 887270);
        (int24 lo, int24 hi) = PriceMath.fullRange(60);
        assertEq(lo, -887220);
        assertEq(hi, 887220);
    }

    function testFuzz_mulDiv(uint128 a, uint128 b, uint128 d) public pure {
        vm.assume(d != 0);
        assertEq(PriceMath.mulDiv(a, b, d), uint256(a) * b / d);
    }
}
