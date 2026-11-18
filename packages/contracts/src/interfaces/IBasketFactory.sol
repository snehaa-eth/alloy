// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBasketFactory {
    /// @notice Allow-list entry for a component token.
    struct TokenConfig {
        address feed; // Chainlink-style feed, 8 decimals, reports price x multiplier per raw token
        address adapter; // ISwapAdapter used for token<->USDC
        bytes poolData; // adapter-specific pool description (fee tier / route), owner-set only
        bool allowed; // usable by NEW baskets; existing baskets keep trading a delisted token
    }

    /// @notice Basket creation parameters.
    struct BasketParams {
        string name;
        string symbol;
        address[] comps;
        uint16[] targetBps; // sum == 10_000, each > 0 and <= capBps
        uint16 absBandBps; // 10_000 => no absolute band
        uint16 relBandBps; // 10_000 => no relative band
        uint16 capBps; // max weight of any component
        uint16 feeBps; // management fee per year, <= 200, immutable
        bool demo; // 10-minute recipe notice instead of 24h (shown in UI)
        bytes32 salt;
    }

    function usdc() external view returns (address);
    function keeper() external view returns (address);
    function treasury() external view returns (address);
    function feedGuard() external view returns (address);
    function paused() external view returns (bool);
    function swapTolBps() external view returns (uint16);
    function isBasket(address basket) external view returns (bool);
    function tvlCapOf(address basket) external view returns (uint256);
    function tokenConfig(address token) external view returns (TokenConfig memory);
}
