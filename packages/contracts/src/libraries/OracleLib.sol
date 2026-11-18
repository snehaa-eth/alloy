// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

/// @notice Unguarded price reads (display NAV, TVL cap, router split). Rebalances use an IFeedGuard instead.
/// @dev Units: token balances 8 dec (B20 stocks), prices 8 dec, USD values 8 dec. value = bal * px / 1e8.
library OracleLib {
    error BadAnswer(address feed);

    uint256 internal constant PRICE_UNIT = 1e8;

    function rawPrice(address feed) internal view returns (uint256) {
        (, int256 answer,,,) = IAggregatorV3(feed).latestRoundData();
        if (answer <= 0) revert BadAnswer(feed);
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(answer); // answer > 0 checked above
    }

    function value(uint256 bal, uint256 px) internal pure returns (uint256) {
        return bal * px / PRICE_UNIT;
    }
}
