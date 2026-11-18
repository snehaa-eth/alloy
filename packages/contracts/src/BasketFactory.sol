// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "solady/auth/Ownable.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

import {Basket} from "./Basket.sol";
import {IBasket} from "./interfaces/IBasket.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";
import {SwapLib} from "./libraries/SwapLib.sol";

interface IERC20Decimals {
    function decimals() external view returns (uint8);
}

/// @title BasketFactory
/// @notice Owns the allow-list (token, feed, adapter, pool), protocol params, the global pause (issue + rebalance
///         only; redeem can never be paused) and deploys Basket clones seeded with USDC in one transaction.
contract BasketFactory is IBasketFactory, Ownable, ReentrancyGuardTransient {
    using SafeTransferLib for address;

    // ------------------------------------------------------------------ events
    event BasketCreated(
        address indexed basket,
        address indexed creator,
        string name,
        string symbol,
        address[] comps,
        uint16[] targetBps,
        uint16 feeBps,
        uint16 absBand,
        uint16 relBand,
        uint16 cap,
        uint64 notice,
        bool demo,
        bytes32 salt
    );
    // admin events (additive, see NOTES.md)
    event TokenAllowed(address indexed token, address feed, address adapter, bytes poolData);
    event TokenDisallowed(address indexed token);
    event KeeperSet(address keeper);
    event TreasurySet(address treasury);
    event FeedGuardSet(address guard);
    event PausedSet(bool paused);
    event SwapTolSet(uint16 tolBps);
    event DefaultTvlCapSet(uint256 capUsd);
    event BasketTvlCapSet(address indexed basket, uint256 capUsd);

    // ------------------------------------------------------------------ errors
    error BadDecimals();
    error ZeroAddress();
    error NotAllowed(address token);
    error DuplicateComponent(address token);
    error SeedTooSmall();
    error LengthMismatch();
    error BadTolerance();

    // ------------------------------------------------------------------ storage
    uint8 public constant STOCK_DECIMALS = 8;
    uint8 public constant FEED_DECIMALS = 8;
    uint256 public constant MIN_SEED = 10e6; // $10 USDC
    /// @dev 1 share == $1 of seed at creation (USDC 6 dec -> shares 18 dec).
    uint256 public constant SEED_SHARE_SCALE = 1e12;

    address public immutable implementation;
    address public immutable usdc;

    address public keeper;
    address public treasury;
    address public feedGuard;
    bool public paused;
    uint16 public swapTolBps = 100;
    uint256 public defaultTvlCapUsd = 5_000e8;

    mapping(address => TokenConfig) internal _cfg;
    mapping(address => bool) public isBasket;
    mapping(address => uint256) public tvlCapOverride; // 0 => default; type(uint256).max => uncapped
    address[] public allBaskets;

    constructor(address owner_, address usdc_, address keeper_, address treasury_, address feedGuard_) {
        if (owner_ == address(0) || usdc_ == address(0) || feedGuard_ == address(0)) revert ZeroAddress();
        _initializeOwner(owner_);
        usdc = usdc_;
        keeper = keeper_;
        treasury = treasury_;
        feedGuard = feedGuard_;
        implementation = address(new Basket());
    }

    // ------------------------------------------------------------------ admin
    function allow(address token, address feed, address adapter, bytes calldata poolData) external onlyOwner {
        if (token == address(0) || feed == address(0) || adapter == address(0)) revert ZeroAddress();
        if (IERC20Decimals(token).decimals() != STOCK_DECIMALS) revert BadDecimals();
        if (IAggregatorV3(feed).decimals() != FEED_DECIMALS) revert BadDecimals();
        _cfg[token] = TokenConfig({feed: feed, adapter: adapter, poolData: poolData, allowed: true});
        emit TokenAllowed(token, feed, adapter, poolData);
    }

    /// @notice Blocks NEW baskets from using `token`. Existing baskets keep its route so users can always exit.
    function disallow(address token) external onlyOwner {
        _cfg[token].allowed = false;
        emit TokenDisallowed(token);
    }

    function setKeeper(address k) external onlyOwner {
        keeper = k;
        emit KeeperSet(k);
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
        emit TreasurySet(t);
    }

    function setFeedGuard(address g) external onlyOwner {
        if (g == address(0)) revert ZeroAddress();
        feedGuard = g;
        emit FeedGuardSet(g);
    }

    /// @notice Pauses issue + rebalance (and therefore router buys / creation). Redeem is never paused.
    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }

    function setSwapTolBps(uint16 tol) external onlyOwner {
        if (tol > 500) revert BadTolerance();
        swapTolBps = tol;
        emit SwapTolSet(tol);
    }

    function setDefaultTvlCap(uint256 capUsd) external onlyOwner {
        defaultTvlCapUsd = capUsd;
        emit DefaultTvlCapSet(capUsd);
    }

    function setBasketTvlCap(address basket, uint256 capUsd) external onlyOwner {
        tvlCapOverride[basket] = capUsd;
        emit BasketTvlCapSet(basket, capUsd);
    }

    // ------------------------------------------------------------------ views
    function tokenConfig(address token) external view returns (TokenConfig memory) {
        return _cfg[token];
    }

    /// @notice TVL cap in USD (8 dec); 0 means uncapped.
    function tvlCapOf(address basket) external view returns (uint256) {
        uint256 o = tvlCapOverride[basket];
        if (o == 0) return defaultTvlCapUsd;
        return o == type(uint256).max ? 0 : o;
    }

    function basketCount() external view returns (uint256) {
        return allBaskets.length;
    }

    function predictBasket(address creator, bytes32 salt) external view returns (address) {
        return LibClone.predictDeterministicAddress(implementation, _salt(creator, salt), address(this));
    }

    // ------------------------------------------------------------------ create
    /// @notice Clone + initialize + buy components with `usdcSeed` (split by target) + mint shares (1 share = $1
    ///         of seed) to the creator, with 0.1% locked as dead shares. `minOuts[i]` protects each seed swap.
    function createBasket(BasketParams calldata p, uint256 usdcSeed, uint256[] calldata minOuts)
        external
        nonReentrant
        returns (address basket)
    {
        if (paused) revert Basket.ProtocolPaused();
        if (usdcSeed < MIN_SEED) revert SeedTooSmall();
        uint256 n = p.comps.length;
        if (minOuts.length != n || p.targetBps.length != n) revert LengthMismatch();
        for (uint256 i; i < n; ++i) {
            if (!_cfg[p.comps[i]].allowed) revert NotAllowed(p.comps[i]);
            for (uint256 j; j < i; ++j) {
                if (p.comps[j] == p.comps[i]) revert DuplicateComponent(p.comps[i]);
            }
        }

        basket = LibClone.cloneDeterministic(implementation, _salt(msg.sender, p.salt));
        isBasket[basket] = true;
        allBaskets.push(basket);
        IBasket(basket).initialize(msg.sender, p);

        usdc.safeTransferFrom(msg.sender, address(this), usdcSeed);
        uint256 spent;
        for (uint256 i; i < n; ++i) {
            uint256 slice = i == n - 1 ? usdcSeed - spent : usdcSeed * p.targetBps[i] / 10_000;
            spent += slice;
            TokenConfig storage c = _cfg[p.comps[i]];
            SwapLib.swap(c.adapter, c.poolData, usdc, p.comps[i], slice, minOuts[i], basket);
        }
        IBasket(basket).seed(usdcSeed * SEED_SHARE_SCALE, msg.sender);

        _emitCreated(basket, p);
    }

    function _emitCreated(address basket, BasketParams calldata p) internal {
        emit BasketCreated(
            basket,
            msg.sender,
            p.name,
            p.symbol,
            p.comps,
            p.targetBps,
            p.feeBps,
            p.absBandBps,
            p.relBandBps,
            p.capBps,
            p.demo ? 10 minutes : 24 hours,
            p.demo,
            p.salt
        );
    }

    function _salt(address creator, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(creator, salt));
    }

    function _useTransientReentrancyGuardOnlyOnMainnet() internal pure override returns (bool) {
        return false;
    }
}
