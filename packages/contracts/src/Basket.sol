// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "solady/tokens/ERC20.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

import {IBasket} from "./interfaces/IBasket.sol";
import {IBasketFactory} from "./interfaces/IBasketFactory.sol";
import {IFeedGuard} from "./interfaces/IFeedGuard.sol";
import {OracleLib} from "./libraries/OracleLib.sol";
import {SwapLib} from "./libraries/SwapLib.sol";

/// @title Basket
/// @notice Shared vault of B20 stock tokens with an ERC-20 receipt (the basket token). Deployed as an EIP-1167
///         clone by `BasketFactory`. Issue/redeem are in-kind and oracle-free (except the TVL-cap read on issue).
///         Rebalances are executed ONLY by the protocol keeper (creators can only propose recipes), encoded by the vault itself through allow-listed
///         adapters, and must pass oracle-guarded loss caps and the band rule.
/// @dev Accounting is in RAW B20 balances; feeds already report price x multiplier, so multiplier changes never
///      touch share math. `unitsPerShare` is never stored: every amount is derived from live balances.
contract Basket is IBasket, ERC20, ReentrancyGuardTransient {
    using SafeTransferLib for address;
    using FixedPointMathLib for uint256;

    // ------------------------------------------------------------------ constants
    uint256 public constant BPS = 10_000;
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS_TO_WAD = 1e14;
    uint256 public constant YEAR = 365 days;
    uint256 public constant MAX_FEE_BPS = 200;
    uint256 public constant CREATOR_FEE_SHARE_BPS = 8000;
    uint256 public constant MAX_COMPONENTS = 10;
    uint64 public constant NOTICE = 24 hours;
    uint64 public constant DEMO_NOTICE = 10 minutes;
    uint256 public constant REBALANCE_COOLDOWN = 1 days;
    uint256 public constant MAX_TX_LOSS_BPS = 150;
    uint256 public constant WEEKLY_LOSS_BUDGET_BPS = 300;
    uint256 public constant BUDGET_WINDOW = 7 days;
    uint256 public constant DEAD_DIVISOR = 1000; // dead shares = 0.1% of the seed
    uint256 public constant DUST_USD = 1e8; // $1 (8 decimals)
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    // ------------------------------------------------------------------ errors
    error NotFactory();
    error AlreadyInitialized();
    error NotCreator();
    error NotKeeper();
    error InvalidParams();
    error InvalidWeights();
    error ZeroAmount();
    error ProtocolPaused();
    error BasketEmpty();
    error AlreadySeeded();
    error TvlCapExceeded(uint256 nav, uint256 cap);
    error NothingOwed();
    error NoPendingRecipe();
    error PendingRecipeExists();
    error RebalanceCooldown(uint256 nextAllowed);
    error InvalidTrade(uint256 index);
    error SupplyChanged();
    error LossTooHigh(uint256 lossWad);
    error WeeklyBudgetExceeded(uint256 usedWad);
    error BandViolation(uint256 component);
    error ZeroNav();
    error CannotRemove();

    // ------------------------------------------------------------------ storage
    address public immutable factory;

    address public creator;
    bool public initialized;
    bool public demo;
    uint16 public absBandBps;
    uint16 public relBandBps;
    uint16 public capBps;
    uint16 public feeBps;
    uint64 public lastAccrual;
    uint64 public lastRebalance;
    uint64 public lossTs;
    uint128 public lossUsedWad; // decaying weekly loss budget usage, 1e18 = 100%
    uint256 public deadShares;

    string internal _name;
    string internal _symbol;
    address[] internal _comps;
    uint16[] internal _targetBps;

    struct Pending {
        uint16[] w;
        uint64 executableAt;
        bytes32 reasonHash;
    }

    Pending internal _pending;

    /// @notice Tokens a redeemer could not receive (B20 transfer policy / pause). Claimable via `claimOwed`.
    mapping(address user => mapping(address token => uint256)) public owed;
    /// @notice Sum of `owed` per token; excluded from vault balances.
    mapping(address token => uint256) public totalOwed;

    // ------------------------------------------------------------------ init
    constructor() {
        factory = msg.sender;
        initialized = true; // lock the implementation
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    modifier onlyCreator() {
        if (msg.sender != creator) revert NotCreator();
        _;
    }

    /// @dev Only the protocol keeper (rotatable by the factory owner) executes rebalances / removals.
    modifier onlyKeeper() {
        if (msg.sender != IBasketFactory(factory).keeper()) revert NotKeeper();
        _;
    }

    /// @inheritdoc IBasket
    /// @dev Token allow-listing (decimals == 8, uniqueness) is enforced by the factory before calling.
    function initialize(address creator_, IBasketFactory.BasketParams calldata p) external onlyFactory {
        if (initialized) revert AlreadyInitialized();
        initialized = true;
        uint256 n = p.comps.length;
        if (n == 0 || n > MAX_COMPONENTS || p.targetBps.length != n) revert InvalidParams();
        if (p.feeBps > MAX_FEE_BPS) revert InvalidParams();
        if (p.capBps == 0 || p.capBps > BPS || p.absBandBps == 0 || p.absBandBps > BPS) revert InvalidParams();
        if (p.relBandBps == 0 || p.relBandBps > BPS) revert InvalidParams();
        if (creator_ == address(0)) revert InvalidParams();
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (p.targetBps[i] == 0 || p.targetBps[i] > p.capBps) revert InvalidWeights();
            sum += p.targetBps[i];
        }
        if (sum != BPS) revert InvalidWeights();

        creator = creator_;
        _name = p.name;
        _symbol = p.symbol;
        _comps = p.comps;
        _targetBps = p.targetBps;
        absBandBps = p.absBandBps;
        relBandBps = p.relBandBps;
        capBps = p.capBps;
        feeBps = p.feeBps;
        demo = p.demo;
    }

    /// @inheritdoc IBasket
    /// @dev Factory has already transferred the bought components to this vault. Mints dead shares (0.1%) to DEAD.
    function seed(uint256 shares, address to) external onlyFactory nonReentrant {
        if (totalSupply() != 0) revert AlreadySeeded();
        uint256 n = _comps.length;
        uint256[] memory amts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amts[i] = _bal(i);
            if (amts[i] == 0) revert BasketEmpty();
        }
        uint256 dead = shares / DEAD_DIVISOR;
        if (dead == 0) revert ZeroAmount();
        deadShares = dead;
        lastAccrual = uint64(block.timestamp);
        _mint(DEAD, dead);
        _mint(to, shares - dead);
        _checkTvlCap();
        emit Issued(to, shares - dead, amts);
    }

    // ------------------------------------------------------------------ ERC20 metadata
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function totalSupply() public view override(ERC20, IBasket) returns (uint256) {
        return super.totalSupply();
    }

    // ------------------------------------------------------------------ issue / redeem
    /// @inheritdoc IBasket
    function issue(uint256 shares, address to) external nonReentrant returns (uint256[] memory amts) {
        if (IBasketFactory(factory).paused()) revert ProtocolPaused();
        if (shares == 0) revert ZeroAmount();
        _accrueFee();
        uint256 ts = totalSupply();
        if (ts <= deadShares) revert BasketEmpty(); // also covers ts == 0 (unseeded)
        uint256 n = _comps.length;
        amts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amts[i] = FixedPointMathLib.mulDivUp(_bal(i), shares, ts);
        }
        for (uint256 i; i < n; ++i) {
            if (amts[i] != 0) _comps[i].safeTransferFrom(msg.sender, address(this), amts[i]);
        }
        _mint(to, shares);
        _checkTvlCap();
        emit Issued(to, shares, amts);
    }

    /// @inheritdoc IBasket
    /// @dev Never pausable. A component transfer that reverts (B20 policy / pause) is credited to `owed`.
    function redeem(uint256 shares, address to)
        external
        nonReentrant
        returns (uint256[] memory amts, uint256 owedMask)
    {
        if (shares == 0) revert ZeroAmount();
        _accrueFee();
        uint256 ts = totalSupply();
        uint256 n = _comps.length;
        amts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amts[i] = FixedPointMathLib.mulDiv(_bal(i), shares, ts);
        }
        _burn(msg.sender, shares);
        for (uint256 i; i < n; ++i) {
            uint256 amt = amts[i];
            if (amt == 0) continue;
            address token = _comps[i];
            if (!_tryTransfer(token, to, amt)) {
                owed[msg.sender][token] += amt;
                totalOwed[token] += amt;
                // forge-lint: disable-next-line(incorrect-shift)
                owedMask |= (1 << i);
            }
        }
        emit Redeemed(msg.sender, to, shares, amts, owedMask);
    }

    /// @inheritdoc IBasket
    function claimOwed(address token, address to) external nonReentrant returns (uint256 amount) {
        amount = owed[msg.sender][token];
        if (amount == 0) revert NothingOwed();
        owed[msg.sender][token] = 0;
        totalOwed[token] -= amount;
        token.safeTransfer(to, amount);
        emit OwedClaimed(msg.sender, token, to, amount);
    }

    // ------------------------------------------------------------------ fees
    /// @inheritdoc IBasket
    function accrueFee() external nonReentrant returns (uint256 minted) {
        return _accrueFee();
    }

    /// @dev minted = ts*f*dt / (YEAR*1e4 - f*dt) so that minted/(ts+minted) == f*dt/(YEAR*1e4).
    ///      `lastAccrual` only advances when something is minted (so frequent pokes cannot round fees away).
    function _accrueFee() internal returns (uint256 minted) {
        uint256 ts = totalSupply();
        if (ts == 0) return 0;
        uint256 creatorShares;
        uint256 protocolShares;
        (minted, creatorShares, protocolShares) = _pendingFee(ts);
        if (minted == 0) {
            if (feeBps == 0) lastAccrual = uint64(block.timestamp);
            return 0;
        }
        lastAccrual = uint64(block.timestamp);
        address treasury = IBasketFactory(factory).treasury();
        if (treasury == address(0)) {
            creatorShares = minted;
            protocolShares = 0;
        }
        _mint(creator, creatorShares);
        if (protocolShares != 0) _mint(treasury, protocolShares);
        emit FeeAccrued(creatorShares, protocolShares);
    }

    function _pendingFee(uint256 ts)
        internal
        view
        returns (uint256 minted, uint256 creatorShares, uint256 protocolShares)
    {
        if (ts == 0 || feeBps == 0) return (0, 0, 0);
        uint256 dt = block.timestamp - lastAccrual;
        if (dt > YEAR) dt = YEAR; // bounds the denominator; > 1y without any poke forfeits the excess
        uint256 fdt = uint256(feeBps) * dt;
        minted = FixedPointMathLib.mulDiv(ts, fdt, YEAR * BPS - fdt);
        creatorShares = minted * CREATOR_FEE_SHARE_BPS / BPS;
        protocolShares = minted - creatorShares;
    }

    // ------------------------------------------------------------------ recipe
    /// @inheritdoc IBasket
    function proposeRecipe(uint16[] calldata w, bytes32 reasonHash) external onlyCreator {
        _validateWeights(w);
        uint64 executableAt = uint64(block.timestamp) + (demo ? DEMO_NOTICE : NOTICE);
        _pending = Pending({w: w, executableAt: executableAt, reasonHash: reasonHash});
        emit RecipeProposed(w, executableAt, reasonHash);
    }

    /// @inheritdoc IBasket
    function cancelRecipe() external onlyCreator {
        if (_pending.executableAt == 0) revert NoPendingRecipe();
        delete _pending;
        emit RecipeCancelled();
    }

    function _validateWeights(uint16[] calldata w) internal view {
        uint256 n = _comps.length;
        if (w.length != n) revert InvalidWeights();
        uint256 sum;
        uint256 cap = capBps;
        for (uint256 i; i < n; ++i) {
            if (w[i] > cap) revert InvalidWeights();
            sum += w[i];
        }
        if (sum != BPS) revert InvalidWeights();
    }

    // ------------------------------------------------------------------ rebalance
    /// @inheritdoc IBasket
    function executeRebalance(Trade[] calldata trades) external nonReentrant onlyKeeper {
        IBasketFactory f = IBasketFactory(factory);
        if (f.paused()) revert ProtocolPaused();
        if (lastRebalance != 0 && block.timestamp < uint256(lastRebalance) + REBALANCE_COOLDOWN) {
            revert RebalanceCooldown(uint256(lastRebalance) + REBALANCE_COOLDOWN);
        }
        _accrueFee();
        uint256 ts = totalSupply();
        if (ts <= deadShares) revert BasketEmpty();

        // Recipe change: replace target first, then the same band rule applies.
        if (_pending.executableAt != 0 && block.timestamp >= _pending.executableAt) {
            uint16[] memory w = _pending.w;
            _targetBps = w;
            delete _pending;
            emit RecipeExecuted(w);
        }

        uint256 n = _comps.length;
        uint256[] memory px = new uint256[](n);
        {
            IFeedGuard guard = IFeedGuard(f.feedGuard());
            for (uint256 i; i < n; ++i) {
                address token = _comps[i];
                px[i] = guard.checkedPrice(token, f.tokenConfig(token).feed);
            }
        }
        (uint256[] memory vBefore, uint256 navBefore) = _values(px);
        if (navBefore == 0) revert ZeroNav();

        uint16 tol = f.swapTolBps();
        address usdc_ = f.usdc();
        for (uint256 k; k < trades.length; ++k) {
            Trade calldata t = trades[k];
            if (t.from >= n || t.to >= n || t.from == t.to || t.amountIn == 0 || t.amountIn > _bal(t.from)) {
                revert InvalidTrade(k);
            }
            _trade(f, usdc_, tol, t, px);
        }

        (uint256[] memory vAfter, uint256 navAfter) = _values(px);
        if (totalSupply() != ts) revert SupplyChanged();
        uint256 lossWad = _checkLoss(navBefore, navAfter);
        _checkBands(vBefore, navBefore, vAfter, navAfter);

        lastRebalance = uint64(block.timestamp);
        emit Rebalanced(navBefore, navAfter, lossWad / BPS_TO_WAD, msg.sender); // display: floor bps
    }

    /// @dev from -> USDC -> to, each hop with an oracle-derived minOut (USDC assumed = $1).
    function _trade(IBasketFactory f, address usdc_, uint16 tol, Trade calldata t, uint256[] memory px) internal {
        address tokenFrom = _comps[t.from];
        address tokenTo = _comps[t.to];
        IBasketFactory.TokenConfig memory cFrom = f.tokenConfig(tokenFrom);
        IBasketFactory.TokenConfig memory cTo = f.tokenConfig(tokenTo);
        // value (8 dec USD) -> USDC (6 dec)
        uint256 minUsdc = OracleLib.value(t.amountIn, px[t.from]) / 100 * (BPS - tol) / BPS;
        uint256 usdcOut =
            SwapLib.swap(cFrom.adapter, cFrom.poolData, tokenFrom, usdc_, t.amountIn, minUsdc, address(this));
        uint256 minOut = usdcOut * 100 * OracleLib.PRICE_UNIT / px[t.to] * (BPS - tol) / BPS;
        SwapLib.swap(cTo.adapter, cTo.poolData, usdc_, tokenTo, usdcOut, minOut, address(this));
    }

    function _checkLoss(uint256 navBefore, uint256 navAfter) internal returns (uint256 lossWad) {
        if (navAfter < navBefore) {
            lossWad = FixedPointMathLib.mulDivUp(navBefore - navAfter, WAD, navBefore);
        }
        if (lossWad > MAX_TX_LOSS_BPS * BPS_TO_WAD) revert LossTooHigh(lossWad);
        uint256 decay = (block.timestamp - lossTs) * (WEEKLY_LOSS_BUDGET_BPS * BPS_TO_WAD) / BUDGET_WINDOW;
        uint256 used = lossUsedWad;
        used = (used > decay ? used - decay : 0) + lossWad; // gains never refill the budget
        if (used > WEEKLY_LOSS_BUDGET_BPS * BPS_TO_WAD) revert WeeklyBudgetExceeded(used);
        // forge-lint: disable-next-line(unsafe-typecast)
        lossUsedWad = uint128(used); // used <= 3e16
        lossTs = uint64(block.timestamp);
    }

    /// @dev Band rule (§3.1): every component must END in band. A component that started out of band must also
    ///      not get further from target and must not cross it. In band := |w - T| <= band(T) && w <= cap, where
    ///      band(T) = min(abs, rel * T) (a 10_000 setting disables that limb) and band(0) = 0.
    function _checkBands(uint256[] memory vB, uint256 navB, uint256[] memory vA, uint256 navA) internal view {
        uint256 n = vB.length;
        uint256 cap = uint256(capBps) * BPS_TO_WAD;
        for (uint256 i; i < n; ++i) {
            uint256 tgt = uint256(_targetBps[i]) * BPS_TO_WAD;
            uint256 band = bandOf(_targetBps[i]);
            uint256 wB = FixedPointMathLib.mulDiv(vB[i], WAD, navB);
            uint256 wA = navA == 0 ? 0 : FixedPointMathLib.mulDiv(vA[i], WAD, navA);
            uint256 dB = FixedPointMathLib.dist(wB, tgt);
            uint256 dA = FixedPointMathLib.dist(wA, tgt);
            if (dA > band || wA > cap) revert BandViolation(i);
            bool inBefore = dB <= band && wB <= cap;
            if (!inBefore) {
                if (dA > dB) revert BandViolation(i);
                if ((wB > tgt && wA < tgt) || (wB < tgt && wA > tgt)) revert BandViolation(i);
            }
        }
    }

    /// @notice Drift band (1e18 = 100%) for a target weight in bps.
    function bandOf(uint16 tBps) public view returns (uint256 band) {
        if (tBps == 0) return 0;
        band = type(uint256).max;
        if (absBandBps < BPS) band = uint256(absBandBps) * BPS_TO_WAD;
        if (relBandBps < BPS) band = FixedPointMathLib.min(band, uint256(tBps) * relBandBps * BPS_TO_WAD / BPS);
    }

    // ------------------------------------------------------------------ remove component
    /// @inheritdoc IBasket
    /// @dev Only when target == 0 and value < $1. Dust goes to the protocol treasury.
    function removeComponent(uint8 i) external nonReentrant onlyKeeper {
        uint256 n = _comps.length;
        if (i >= n || n == 1 || _targetBps[i] != 0 || _pending.executableAt != 0) revert CannotRemove();
        address token = _comps[i];
        IBasketFactory f = IBasketFactory(factory);
        uint256 bal = _bal(i);
        if (OracleLib.value(bal, OracleLib.rawPrice(f.tokenConfig(token).feed)) >= DUST_USD) revert CannotRemove();
        _comps[i] = _comps[n - 1];
        _targetBps[i] = _targetBps[n - 1];
        _comps.pop();
        _targetBps.pop();
        if (bal != 0) {
            address sink = f.treasury();
            token.safeTransfer(sink == address(0) ? creator : sink, bal);
        }
        emit ComponentRemoved(token);
    }

    // ------------------------------------------------------------------ views
    /// @inheritdoc IBasket
    function nav() external view nonReadReentrant returns (uint256 total) {
        (, total) = _values(_rawPrices());
    }

    /// @inheritdoc IBasket
    /// @dev USD (8 dec) per 1e18 shares.
    function navPerShare() external view nonReadReentrant returns (uint256) {
        uint256 ts = totalSupply();
        if (ts == 0) return 0;
        (, uint256 total) = _values(_rawPrices());
        return FixedPointMathLib.mulDiv(total, WAD, ts);
    }

    /// @inheritdoc IBasket
    function componentValues() external view nonReadReentrant returns (uint256[] memory values) {
        (values,) = _values(_rawPrices());
    }

    /// @inheritdoc IBasket
    function getBundle() external view nonReadReentrant returns (address[] memory tokens, uint256[] memory balances) {
        tokens = _comps;
        balances = new uint256[](tokens.length);
        for (uint256 i; i < tokens.length; ++i) {
            balances[i] = _bal(i);
        }
    }

    /// @inheritdoc IBasket
    /// @dev Accounts for the fee that `issue` would accrue first.
    function previewIssue(uint256 shares) external view nonReadReentrant returns (uint256[] memory amts) {
        uint256 ts = totalSupply();
        (uint256 minted,,) = _pendingFee(ts);
        ts += minted;
        uint256 n = _comps.length;
        amts = new uint256[](n);
        if (ts == 0) return amts;
        for (uint256 i; i < n; ++i) {
            amts[i] = FixedPointMathLib.mulDivUp(_bal(i), shares, ts);
        }
    }

    /// @inheritdoc IBasket
    function previewRedeem(uint256 shares) external view nonReadReentrant returns (uint256[] memory amts) {
        uint256 ts = totalSupply();
        (uint256 minted,,) = _pendingFee(ts);
        ts += minted;
        uint256 n = _comps.length;
        amts = new uint256[](n);
        if (ts == 0) return amts;
        for (uint256 i; i < n; ++i) {
            amts[i] = FixedPointMathLib.mulDiv(_bal(i), shares, ts);
        }
    }

    function components() external view returns (address[] memory) {
        return _comps;
    }

    function targets() external view returns (uint16[] memory) {
        return _targetBps;
    }

    function pendingRecipe() external view returns (uint16[] memory w, uint64 executableAt, bytes32 reasonHash) {
        return (_pending.w, _pending.executableAt, _pending.reasonHash);
    }

    function notice() external view returns (uint64) {
        return demo ? DEMO_NOTICE : NOTICE;
    }

    function pendingFee() external view returns (uint256 minted) {
        (minted,,) = _pendingFee(totalSupply());
    }

    /// @notice Remaining weekly loss budget (1e18 = 100%) after decay.
    function lossBudgetUsed() external view returns (uint256) {
        uint256 decay = (block.timestamp - lossTs) * (WEEKLY_LOSS_BUDGET_BPS * BPS_TO_WAD) / BUDGET_WINDOW;
        return lossUsedWad > decay ? lossUsedWad - decay : 0;
    }

    // ------------------------------------------------------------------ internals
    /// @dev Vault balance excluding tokens owed to redeemers.
    function _bal(uint256 i) internal view returns (uint256) {
        address token = _comps[i];
        return SafeTransferLib.balanceOf(token, address(this)) - totalOwed[token];
    }

    function _rawPrices() internal view returns (uint256[] memory px) {
        IBasketFactory f = IBasketFactory(factory);
        uint256 n = _comps.length;
        px = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            px[i] = OracleLib.rawPrice(f.tokenConfig(_comps[i]).feed);
        }
    }

    function _values(uint256[] memory px) internal view returns (uint256[] memory v, uint256 total) {
        uint256 n = px.length;
        v = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            v[i] = OracleLib.value(_bal(i), px[i]);
            total += v[i];
        }
    }

    function _checkTvlCap() internal view {
        uint256 cap = IBasketFactory(factory).tvlCapOf(address(this));
        if (cap == 0) return;
        (, uint256 total) = _values(_rawPrices());
        if (total > cap) revert TvlCapExceeded(total, cap);
    }

    /// @dev Transfer that never reverts; returns false on failure (e.g. B20 `PolicyForbids`, paused token).
    function _tryTransfer(address token, address to, uint256 amt) internal returns (bool) {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amt));
        if (!ok) return false;
        if (ret.length == 0) return token.code.length != 0;
        return ret.length == 32 && abi.decode(ret, (bool));
    }

    /// @dev Standard ERC-20 allowance semantics (no implicit Permit2 infinite allowance).
    function _givePermit2InfiniteAllowance() internal pure override returns (bool) {
        return false;
    }

    /// @dev Always use transient storage (Base supports EIP-1153).
    function _useTransientReentrancyGuardOnlyOnMainnet() internal pure override returns (bool) {
        return false;
    }
}
