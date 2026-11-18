// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PriceMath
/// @notice Converts between an 8-decimal Chainlink USD answer and a Uniswap v3 `sqrtPriceX96` for a
///         stock/USDC pool, accounting for token decimals (stock 8, USDC 6) and token ordering.
/// @dev Uniswap price = token1 raw units per token0 raw unit.
///      stock is token0: price = answer * 10^usdcDec / 10^(feedDec + stockDec)
///      stock is token1: price = 10^(feedDec + stockDec) / (answer * 10^usdcDec)
///      sqrtPriceX96 = sqrt(price * 2^192)
library PriceMath {
    uint256 internal constant Q192 = 1 << 192;
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = 887272;

    function sqrtPriceX96FromAnswer(
        uint256 answer,
        uint8 feedDecimals,
        uint8 stockDecimals,
        uint8 usdcDecimals,
        bool stockIsToken0
    ) internal pure returns (uint160) {
        uint256 num = answer * 10 ** usdcDecimals;
        uint256 den = 10 ** (uint256(feedDecimals) + stockDecimals);
        uint256 ratioX192 = stockIsToken0 ? mulDiv(num, Q192, den) : mulDiv(den, Q192, num);
        return uint160(sqrt(ratioX192));
    }

    /// @notice Inverse of `sqrtPriceX96FromAnswer` (rounds down).
    function answerFromSqrtPriceX96(
        uint160 sqrtPriceX96,
        uint8 feedDecimals,
        uint8 stockDecimals,
        uint8 usdcDecimals,
        bool stockIsToken0
    ) internal pure returns (uint256) {
        uint256 sp = uint256(sqrtPriceX96);
        uint256 scale = 10 ** (uint256(feedDecimals) + stockDecimals);
        uint256 usdcScale = 10 ** usdcDecimals;
        // priceX192 = sp^2  (token1 per token0, X192)
        uint256 priceX128 = mulDiv(sp, sp, 1 << 64); // sp^2 / 2^64 => X128, fits for realistic prices
        if (stockIsToken0) {
            return mulDiv(priceX128, scale, usdcScale << 128);
        } else {
            return mulDiv(scale, 1 << 128, priceX128) / usdcScale;
        }
    }

    /// @notice Rounds `tick` toward negative infinity to a multiple of `spacing`, clamped to the usable range.
    function floorTick(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 t = tick / spacing;
        if (tick < 0 && tick % spacing != 0) t--;
        t = t * spacing;
        int24 minUsable = (MIN_TICK / spacing) * spacing;
        int24 maxUsable = (MAX_TICK / spacing) * spacing;
        if (t < minUsable) return minUsable;
        if (t > maxUsable) return maxUsable;
        return t;
    }

    function fullRange(int24 spacing) internal pure returns (int24 lower, int24 upper) {
        lower = (MIN_TICK / spacing) * spacing;
        upper = (MAX_TICK / spacing) * spacing;
    }

    /// @notice Babylonian integer square root (floor).
    function sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = 1;
        uint256 y = x;
        if (y >= 1 << 128) { y >>= 128; z <<= 64; }
        if (y >= 1 << 64) { y >>= 64; z <<= 32; }
        if (y >= 1 << 32) { y >>= 32; z <<= 16; }
        if (y >= 1 << 16) { y >>= 16; z <<= 8; }
        if (y >= 1 << 8) { y >>= 8; z <<= 4; }
        if (y >= 1 << 4) { y >>= 4; z <<= 2; }
        if (y >= 1 << 2) { z <<= 1; }
        unchecked {
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            uint256 zz = x / z;
            if (zz < z) z = zz;
        }
    }

    /// @notice floor(a * b / d) with 512-bit intermediate (Remco Bloemen / Uniswap FullMath, 0.8 port).
    function mulDiv(uint256 a, uint256 b, uint256 d) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) {
                require(d > 0);
                assembly {
                    result := div(prod0, d)
                }
                return result;
            }
            require(d > prod1);
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, d)
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = d & (~d + 1);
            assembly {
                d := div(d, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * d) ^ 2;
            inv *= 2 - d * inv;
            inv *= 2 - d * inv;
            inv *= 2 - d * inv;
            inv *= 2 - d * inv;
            inv *= 2 - d * inv;
            inv *= 2 - d * inv;
            result = prod0 * inv;
        }
    }
}
